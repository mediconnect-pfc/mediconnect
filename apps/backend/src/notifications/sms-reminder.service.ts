import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GomobileService } from './gomobile.service';
import type { SmsDeliveryJobData } from './sms-delivery.service';
import {
  HOURS_BEFORE_REMINDER,
  MS_PER_HOUR,
  SMS_REMINDER_JOB_ID_PREFIX,
  SMS_REMINDER_JOB_NAME,
  SMS_REMINDER_QUEUE,
} from './sms-reminder.constants';

export interface ScheduleSmsReminderParams {
  appointmentId: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string;
  doctorName: string;
  slot: Date;
}

@Injectable()
export class SmsReminderService {
  private readonly logger = new Logger(SmsReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gomobile: GomobileService,
    @InjectQueue(SMS_REMINDER_QUEUE) private readonly queue: Queue,
  ) {}

  buildMessage(params: ScheduleSmsReminderParams): string {
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
      `Rappel MediConnect — Bonjour ${name},`,
      `votre RDV avec ${params.doctorName}`,
      `est le ${date} a ${time}.`,
      `A bientot !`,
    ].join(' ');
  }

  getReminderAt(slot: Date): Date {
    return new Date(slot.getTime() - HOURS_BEFORE_REMINDER * MS_PER_HOUR);
  }

  async scheduleReminder(params: ScheduleSmsReminderParams): Promise<void> {
    if (!this.gomobile.isConfigured()) {
      this.logger.warn('GoMobile not configured — skipping SMS reminder');
      return;
    }

    if (!params.patientPhone?.trim()) {
      this.logger.warn(`No phone for patient ${params.patientId} — skipping SMS reminder`);
      return;
    }

    const reminderAt = this.getReminderAt(params.slot);
    const delay = reminderAt.getTime() - Date.now();

    if (delay <= 0) {
      this.logger.log(
        `Appointment ${params.appointmentId} is in less than ${HOURS_BEFORE_REMINDER}h — no reminder scheduled`,
      );
      return;
    }

    const message = this.buildMessage(params);

    try {
      await this.cancelReminder(params.appointmentId);

      const notification = await this.prisma.notification.create({
        data: {
          patientId: params.patientId,
          appointmentId: params.appointmentId,
          channel: NotificationChannel.SMS,
          status: NotificationStatus.PENDING,
          message,
          scheduledAt: reminderAt,
        },
      });

      const jobData: SmsDeliveryJobData = {
        notificationId: notification.id,
        appointmentId: params.appointmentId,
        patientId: params.patientId,
        phone: params.patientPhone,
        message,
      };

      await this.queue.add(SMS_REMINDER_JOB_NAME, jobData, {
        jobId: `${SMS_REMINDER_JOB_ID_PREFIX}${params.appointmentId}`,
        delay,
        attempts: 4,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(
        `SMS reminder scheduled for appointment ${params.appointmentId} at ${reminderAt.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule SMS reminder for appointment ${params.appointmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async cancelReminder(appointmentId: string): Promise<void> {
    const jobId = `${SMS_REMINDER_JOB_ID_PREFIX}${appointmentId}`;

    try {
      const job = await this.queue.getJob(jobId);
      if (!job) return;

      const state = await job.getState();
      if (!['delayed', 'waiting', 'paused'].includes(state)) return;

      const { notificationId } = job.data as SmsDeliveryJobData;
      await job.remove();

      if (notificationId) {
        await this.prisma.notification.deleteMany({
          where: { id: notificationId, status: NotificationStatus.PENDING },
        });
      }

      this.logger.log(`SMS reminder cancelled for appointment ${appointmentId}`);
    } catch (error) {
      this.logger.error(
        `Failed to cancel SMS reminder for appointment ${appointmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
