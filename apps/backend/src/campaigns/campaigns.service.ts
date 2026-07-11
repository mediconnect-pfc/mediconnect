import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { CampaignStatus, CampaignType, MessageStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CAMPAIGN_JOB_NAME, CAMPAIGN_QUEUE, CampaignJobData } from './campaign.constants';

type CampaignContact = {
  phone: string;
  name?: string | null;
  patientId?: string | null;
};

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(CAMPAIGN_QUEUE) private readonly queue: Queue,
  ) {}

  private getMaxContacts(): number {
    const raw = this.config.get<string>('CAMPAIGN_MAX_CONTACTS', '200');
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
  }

  private getJobSpacingMs(): number {
    const raw = this.config.get<string>('CAMPAIGN_JOB_SPACING_MS', '250');
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 250;
  }

  private ensureContactLimit(count: number) {
    const maxContacts = this.getMaxContacts();
    if (count > maxContacts) {
      throw new BadRequestException(
        `Campagne trop volumineuse pour l'environnement actuel: ${count} contacts, maximum ${maxContacts}.`,
      );
    }
  }

  private normalizePhone(value?: string | null) {
    return value?.trim() ?? '';
  }

  private normalizeName(value?: string | null) {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  }

  private async enqueueCampaignMessages(params: {
    campaignId: string;
    contacts: CampaignContact[];
    campaignMessage: string;
    campaignType: CampaignType;
    delay?: number;
  }) {
    const { campaignId, contacts, campaignMessage, campaignType, delay = 0 } = params;
    const jobSpacingMs = this.getJobSpacingMs();

    if (contacts.length === 0) {
      return [];
    }

    const createdMessages = await this.prisma.$transaction(
      contacts.map((contact) =>
        this.prisma.campaignMessage.create({
          data: {
            campaignId,
            patientId: contact.patientId ?? null,
            phone: this.normalizePhone(contact.phone),
            contactName: this.normalizeName(contact.name),
            status: MessageStatus.PENDING,
          },
        }),
      ),
    );

    await Promise.all(
      createdMessages.map((message, index) =>
        this.queue.add(
          CAMPAIGN_JOB_NAME,
          {
            campaignId,
            campaignMessageId: message.id,
            patientId: message.patientId ?? undefined,
            phone: message.phone ?? contacts[index]?.phone ?? '',
            name: message.contactName ?? contacts[index]?.name ?? null,
            message: campaignMessage,
            type: campaignType,
          } satisfies CampaignJobData,
          {
            jobId: `campaign-${message.id}`,
            delay: delay + index * jobSpacingMs,
            attempts: 2,
            backoff: { type: 'exponential', delay: 15_000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        ),
      ),
    );

    return createdMessages;
  }

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
      select: {
        id: true,
        status: true,
        type: true,
        message: true,
        scheduledAt: true,
        segment: true,
      },
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
        firstName: true,
        lastName: true,
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

    const contacts = patients.map((patient) => ({
      phone: patient.phone,
      name: `${patient.firstName} ${patient.lastName}`.trim(),
      patientId: patient.id,
    }));

    this.ensureContactLimit(contacts.length);

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: CampaignStatus.RUNNING,
        completedAt: null,
      },
    });

    await this.enqueueCampaignMessages({
      campaignId: campaign.id,
      contacts,
      campaignMessage: campaign.message ?? '',
      campaignType: campaign.type,
      delay,
    });

    return this.prisma.campaign.findUnique({
      where: { id: campaign.id },
    });
  }

  async parseCsvContacts(buffer: Buffer): Promise<Array<{ phone: string; name?: string }>> {
    const { parse } = require('csv-parse/sync');
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records
      .filter((row: any) => row.phone?.trim())
      .map((row: any) => ({
        phone: row.phone.trim(),
        name: row.name?.trim() ?? '',
      }));
  }

  async launchWithContacts(
    campaignId: string,
    establishmentId: string,
    contacts: Array<{ phone: string; name?: string }>,
  ): Promise<{ status: string; totalContacts: number }> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, establishmentId },
      select: {
        id: true,
        status: true,
        type: true,
        message: true,
        scheduledAt: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campagne non trouvée');
    }

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Campagne déjà en cours');
    }

    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Campagne déjà terminée');
    }

    const validContacts = contacts
      .map((contact) => ({
        phone: this.normalizePhone(contact.phone),
        name: this.normalizeName(contact.name),
      }))
      .filter((contact) => contact.phone.length > 0);

    if (validContacts.length === 0) {
      throw new BadRequestException('Aucun contact valide dans le fichier CSV');
    }

    this.ensureContactLimit(validContacts.length);

    const launchAt =
      campaign.type === CampaignType.EMERGENCY
        ? new Date()
        : campaign.scheduledAt && campaign.scheduledAt > new Date()
          ? campaign.scheduledAt
          : new Date();
    const delay = Math.max(launchAt.getTime() - Date.now(), 0);

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: CampaignStatus.RUNNING,
        completedAt: null,
      },
    });

    await this.enqueueCampaignMessages({
      campaignId,
      contacts: validContacts,
      campaignMessage: campaign.message ?? '',
      campaignType: campaign.type,
      delay,
    });

    return {
      status: CampaignStatus.RUNNING,
      totalContacts: validContacts.length,
    };
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
      where: {
        campaignId,
        status: { in: [MessageStatus.PENDING, MessageStatus.SENT] },
      },
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
