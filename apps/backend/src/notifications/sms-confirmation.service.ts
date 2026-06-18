import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GomobileService } from './gomobile.service';
import type { SmsDeliveryJobData } from './sms-delivery.service';
import { SMS_CONFIRMATION_QUEUE, SMS_JOB_NAME } from './sms-confirmation.constants';

export type SmsConfirmationJobData = SmsDeliveryJobData;

export interface ScheduleSmsConfirmationParams {
  appointmentId: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string;
  doctorName: string;
  slot: Date;
  portalLink: string;
}

@Injectable()
export class SmsConfirmationService {
  private readonly logger = new Logger(SmsConfirmationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gomobile: GomobileService,
    @InjectQueue(SMS_CONFIRMATION_QUEUE) private readonly queue: Queue,
  ) {}

  buildMessage(params: ScheduleSmsConfirmationParams): string {
    const name = `${params.patientFirstName} ${params.patientLastName}`.trim();
    const date = params.slot.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const time = params.slot.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return [
      `Bonjour ${name},`,
      `votre RDV avec ${params.doctorName}`,
      `est le ${date} a ${time}.`,
      `Confirmez ici: ${params.portalLink}`,
    ].join(' ');
  }

  async scheduleConfirmation(params: ScheduleSmsConfirmationParams): Promise<void> {
    if (!this.gomobile.isConfigured()) {
      this.logger.warn('GoMobile not configured — skipping SMS confirmation');
      return;
    }

    if (!params.patientPhone?.trim()) {
      this.logger.warn(`No phone for patient ${params.patientId} — skipping SMS`);
      return;
    }

    const message = this.buildMessage(params);

    try {
    const notification = await this.prisma.notification.create({
      data: {
        patientId: params.patientId,
        appointmentId: params.appointmentId,
        channel: NotificationChannel.SMS,
        status: NotificationStatus.PENDING,
        message,
        scheduledAt: new Date(),
      },
    });

    const jobData: SmsConfirmationJobData = {
      notificationId: notification.id,
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      phone: params.patientPhone,
      message,
    };

    await this.queue.add(SMS_JOB_NAME, jobData, {
      jobId: `sms-confirmation-${params.appointmentId}`,
      attempts: 4,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(`SMS confirmation queued for appointment ${params.appointmentId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue SMS for appointment ${params.appointmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
