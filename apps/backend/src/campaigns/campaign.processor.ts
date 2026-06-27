import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CampaignStatus, CampaignType, MessageStatus } from '@prisma/client';
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
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { campaignId, campaignMessageId, patientId } = job.data;

    const campaignMessage = await this.prisma.campaignMessage.findUnique({
      where: { id: campaignMessageId },
      include: {
        campaign: true,
        patient: { select: { id: true, firstName: true, lastName: true, phone: true, deletedAt: true } },
      },
    });

    if (!campaignMessage) {
      this.logger.warn(`Campaign message ${campaignMessageId} not found`);
      return;
    }

    if (!campaignMessage.patient || campaignMessage.patient.deletedAt) {
      await this.campaignsService.markMessageFailed(campaignMessageId);
      await this.campaignsService.completeCampaignIfDone(campaignId);
      return;
    }

    if (
      campaignMessage.campaign.status !== CampaignStatus.RUNNING ||
      campaignMessage.status !== MessageStatus.PENDING
    ) {
      this.logger.log(`Campaign message ${campaignMessageId} already handled or campaign paused`);
      return;
    }

    if (!campaignMessage.patient.phone?.trim()) {
      await this.campaignsService.markMessageFailed(campaignMessageId);
      await this.campaignsService.completeCampaignIfDone(campaignId);
      return;
    }

    try {
      if (campaignMessage.campaign.type === CampaignType.VOICE) {
        const result = await this.gomobile.triggerCallByPhone({
          phone: campaignMessage.patient.phone,
          fullName: `${campaignMessage.patient.firstName} ${campaignMessage.patient.lastName}`.trim(),
          attributes: {
            campaignId,
            campaignMessageId,
            patientId,
            campaignName: campaignMessage.campaign.name,
            campaignType: campaignMessage.campaign.type,
          },
        });

        await this.campaignsService.markMessageSent(campaignMessageId, result.jobId);
      } else {
        const result = await this.gomobile.sendSms(
          campaignMessage.patient.phone,
          campaignMessage.campaign.message ?? '',
        );

        await this.campaignsService.markMessageDelivered(
          campaignMessageId,
          result.smsLogId ?? result.messageId,
        );
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
