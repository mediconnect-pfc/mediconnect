import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { CampaignStatus, MessageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GomobileApiError, GomobileService } from '../notifications/gomobile.service';
import { CAMPAIGN_QUEUE, CampaignJobData } from './campaign.constants';
import { CampaignsService } from './campaigns.service';

@Processor(CAMPAIGN_QUEUE, { lockDuration: 900_000 })
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gomobile: GomobileService,
    private readonly campaignsService: CampaignsService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { campaignId, campaignMessageId, phone, name, message, type } = job.data;

    const campaignMessage = await this.prisma.campaignMessage.findUnique({
      where: { id: campaignMessageId },
      include: {
        campaign: {
          include: {
            establishment: {
              select: {
                name: true,
                phone: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!campaignMessage) {
      this.logger.warn(`Campaign message ${campaignMessageId} not found`);
      return;
    }

    if (
      campaignMessage.campaign.status !== CampaignStatus.RUNNING ||
      campaignMessage.status !== MessageStatus.PENDING
    ) {
      this.logger.log(`Campaign message ${campaignMessageId} already handled or campaign paused`);
      return;
    }

    const targetPhone = phone?.trim() || campaignMessage.phone?.trim() || '';
    const targetName = name?.trim() || campaignMessage.contactName?.trim() || 'Patient';
    let gomobileJobId = campaignMessage.externalRef?.trim() || undefined;

    if (!targetPhone) {
      await this.campaignsService.markMessageFailed(campaignMessageId);
      await this.campaignsService.completeCampaignIfDone(campaignId);
      return;
    }

    try {
      if (type === 'VOICE') {
        if (!gomobileJobId) {
          const vaccinationFlowId = this.gomobile.getCallFlowId('vaccination');
          const senderId =
            this.config.get<string>('GOMOBILE_SENDER_ID') ??
            this.config.get<string>('GOMOBILE_SENDER_ID_VACCINATION') ??
            'CLINIQUE';
          const campaignStartDate =
            this.config.get<string>('VACCINATION_CAMPAIGN_START_DATE') ?? '';
          const campaignEndDate =
            this.config.get<string>('VACCINATION_CAMPAIGN_END_DATE') ?? '';
          const vaccinationLocation =
            this.config.get<string>('VACCINATION_LOCATION') ??
            campaignMessage.campaign.establishment.address ??
            '';
          const appointmentPhone =
            this.config.get<string>('VACCINATION_APPOINTMENT_PHONE') ??
            campaignMessage.campaign.establishment.phone ??
            '';

          const result = await this.gomobile.triggerCallByPhone(
            {
              phone: targetPhone,
              fullName: targetName,
              attributes: {
                patientName: targetName,
                clinicName: campaignMessage.campaign.establishment.name,
                campaignStartDate,
                campaignEndDate,
                vaccinationLocation,
                appointmentPhone,
                senderId,
              },
            },
            vaccinationFlowId,
          );

          gomobileJobId = result.jobId;

          await this.prisma.campaignMessage.update({
            where: { id: campaignMessageId },
            data: {
              status: MessageStatus.SENT,
              externalRef: gomobileJobId,
            },
          });
        }

        const report = await this.gomobile.pollCallReport(gomobileJobId, {
          intervalMs: 5_000,
          maxWaitMs: 120_000,
        });

        const lastAttempt = report.attempts?.[report.attempts.length - 1];
        const finalVariables = lastAttempt?.flowExecution?.finalVariables;
        const vaccinationResponse = finalVariables?.['vaccination.response'];
        const dtmfResponse = finalVariables?.['dtmf.response'];
        this.logger.log(
          `Campaign voice call ${campaignMessageId} finished with response=${String(vaccinationResponse ?? 'unknown')} dtmf=${String(dtmfResponse ?? 'unknown')}`,
        );

        await this.prisma.campaignMessage.update({
          where: { id: campaignMessageId },
          data: {
            status: report.status === 'completed' ? MessageStatus.DELIVERED : MessageStatus.FAILED,
            deliveredAt: report.status === 'completed' ? new Date() : null,
            externalRef: gomobileJobId ?? `sent_${Date.now()}`,
          },
        });
      } else {
        const result = await this.gomobile.sendSms(targetPhone, message);

        await this.prisma.campaignMessage.update({
          where: { id: campaignMessageId },
          data: {
            status: MessageStatus.DELIVERED,
            deliveredAt: new Date(),
            externalRef: result.smsLogId ?? result.messageId ?? `sent_${Date.now()}`,
          },
        });
      }

      await this.campaignsService.completeCampaignIfDone(campaignId);
      return;
    } catch (error) {
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;

      if (error instanceof GomobileApiError && !error.retryable) {
        await this.campaignsService.markMessageFailed(campaignMessageId);
        await this.campaignsService.completeCampaignIfDone(campaignId);
        return;
      }

      if (isLastAttempt) {
        await this.campaignsService.markMessageFailed(campaignMessageId);
        await this.campaignsService.completeCampaignIfDone(campaignId);
        return;
      }

      throw error;
    }
  }
}
