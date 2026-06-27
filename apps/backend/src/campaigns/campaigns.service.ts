import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { CampaignStatus, CampaignType, MessageStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CAMPAIGN_JOB_NAME, CAMPAIGN_QUEUE, CampaignJobData } from './campaign.constants';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(CAMPAIGN_QUEUE) private readonly queue: Queue,
  ) {}

  async create(establishmentId: string, data: {
    name: string;
    type: CampaignType;
    message: string;
    segment?: string | null;
    scheduledAt?: string | null;
  }) {
    return this.prisma.campaign.create({
      data: {
        establishmentId,
        name: data.name,
        type: data.type,
        message: data.message,
        segment: data.segment?.trim() || undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        status: CampaignStatus.DRAFT,
      },
    });
  }

  async findAll(establishmentId: string) {
    return this.prisma.campaign.findMany({
      where: { establishmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneWithStats(establishmentId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, establishmentId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} introuvable`);
    }

    const [totalMessages, sent, delivered, failed] = await Promise.all([
      this.prisma.campaignMessage.count({ where: { campaignId: id } }),
      this.prisma.campaignMessage.count({ where: { campaignId: id, status: MessageStatus.SENT } }),
      this.prisma.campaignMessage.count({ where: { campaignId: id, status: MessageStatus.DELIVERED } }),
      this.prisma.campaignMessage.count({ where: { campaignId: id, status: MessageStatus.FAILED } }),
    ]);

    return {
      campaign,
      stats: {
        totalMessages,
        sent,
        delivered,
        failed,
      },
    };
  }

  async launch(establishmentId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, establishmentId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} introuvable`);
    }

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Campaign deja lancee');
    }

    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Campaign deja terminee');
    }

    const tagFilters = campaign.segment
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

    const patients = await this.prisma.patient.findMany({
      where: {
        establishmentId,
        deletedAt: null,
        phone: { not: '' },
        ...(tagFilters.length > 0 ? { tags: { hasSome: tagFilters } } : {}),
      },
      select: {
        id: true,
        phone: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const launchAt =
      campaign.type === CampaignType.EMERGENCY
        ? new Date()
        : campaign.scheduledAt && campaign.scheduledAt > new Date()
          ? campaign.scheduledAt
          : new Date();
    const delay = Math.max(launchAt.getTime() - Date.now(), 0);

    if (patients.length === 0) {
      return this.prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: CampaignStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }

    const createdMessages = await this.prisma.$transaction(
      patients.map((patient) =>
        this.prisma.campaignMessage.create({
          data: {
            campaignId: campaign.id,
            patientId: patient.id,
            status: MessageStatus.PENDING,
          },
        }),
      ),
    );

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: CampaignStatus.RUNNING,
        completedAt: null,
      },
    });

    await Promise.all(
      createdMessages.map((message) =>
        this.queue.add(
          CAMPAIGN_JOB_NAME,
          {
            campaignId: campaign.id,
            campaignMessageId: message.id,
            patientId: message.patientId,
          } satisfies CampaignJobData,
          {
            jobId: `campaign:${message.id}`,
            delay,
            attempts: 3,
            backoff: { type: 'exponential', delay: 15_000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        ),
      ),
    );

    return this.prisma.campaign.findUnique({
      where: { id: campaign.id },
    });
  }

  async pause(establishmentId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, establishmentId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} introuvable`);
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });
  }

  async markMessageSent(campaignMessageId: string, externalRef?: string) {
    return this.prisma.campaignMessage.update({
      where: { id: campaignMessageId },
      data: {
        status: MessageStatus.SENT,
        deliveredAt: new Date(),
        externalRef,
      },
    });
  }

  async markMessageDelivered(campaignMessageId: string, externalRef?: string) {
    return this.prisma.campaignMessage.update({
      where: { id: campaignMessageId },
      data: {
        status: MessageStatus.DELIVERED,
        deliveredAt: new Date(),
        externalRef,
      },
    });
  }

  async markMessageFailed(campaignMessageId: string) {
    return this.prisma.campaignMessage.update({
      where: { id: campaignMessageId },
      data: { status: MessageStatus.FAILED },
    });
  }

  async completeCampaignIfDone(campaignId: string) {
    const pendingCount = await this.prisma.campaignMessage.count({
      where: { campaignId, status: MessageStatus.PENDING },
    });

    if (pendingCount > 0) {
      return null;
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true },
    });

    if (!campaign || campaign.status !== CampaignStatus.RUNNING) {
      return campaign;
    }

    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }
}
