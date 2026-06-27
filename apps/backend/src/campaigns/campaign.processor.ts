import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
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
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { campaignId, campaignMessageId, phone, name, message, type } = job.data;

    const campaignMessage = await this.prisma.campaignMessage.findUnique({
      where: { id: campaignMessageId },
      include: {
        campaign: true,
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

    if (!targetPhone) {
      await this.campaignsService.markMessageFailed(campaignMessageId);
      await this.campaignsService.completeCampaignIfDone(campaignId);
      return;
    }

    try {
      if (type === 'VOICE') {
        const result = await this.gomobile.triggerCallByPhone({
          phone: targetPhone,
          fullName: targetName,
          attributes: {
            patientName: targetName,
            message,
          },
        });

        await this.prisma.campaignMessage.update({
          where: { id: campaignMessageId },
          data: {
            status: MessageStatus.DELIVERED,
            deliveredAt: new Date(),
            externalRef: result.jobId ?? `sent_${Date.now()}`,
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
