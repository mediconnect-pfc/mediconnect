import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GomobileService } from './gomobile.service';
import {
  HOURS_BEFORE_REMINDER,
  MS_PER_HOUR,
} from './sms-reminder.constants';
import {
  CALL_REMINDER_JOB_ID_PREFIX,
  CALL_REMINDER_JOB_NAME,
  CALL_REMINDER_QUEUE,
} from './call-reminder.constants';

export interface CallReminderJobData {
  notificationId: string;
  appointmentId: string;
  patientId: string;
  establishmentId: string;
}

export interface ScheduleCallReminderParams {
  appointmentId: string;
  patientId: string;
  patientPhone: string;
  slot: Date;
  establishmentId: string;
}

@Injectable()
export class CallReminderService {
  private readonly logger = new Logger(CallReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gomobile: GomobileService,
    @InjectQueue(CALL_REMINDER_QUEUE) private readonly queue: Queue,
  ) {}

  getReminderAt(slot: Date): Date {
    return new Date(slot.getTime() - HOURS_BEFORE_REMINDER * MS_PER_HOUR);
  }

  async scheduleReminder(params: ScheduleCallReminderParams): Promise<void> {
    if (!this.gomobile.isCallConfigured()) {
      this.logger.warn('GoMobile call not configured — skipping H-24 call');
      return;
    }

    if (!params.patientPhone?.trim()) {
      this.logger.warn(`No phone for patient ${params.patientId} — skipping H-24 call`);
      return;
    }

    const reminderAt = this.getReminderAt(params.slot);
    const delay = reminderAt.getTime() - Date.now();

    if (delay <= 0) {
      this.logger.log(
        `Appointment ${params.appointmentId} is in less than ${HOURS_BEFORE_REMINDER}h — no call scheduled`,
      );
      return;
    }

    try {
      await this.cancelReminder(params.appointmentId);

      await this.prisma.appointment.update({
        where: { id: params.appointmentId },
        data: { gomobileJobId: null, gomobileCallStatus: 'scheduled' },
      });

      const notification = await this.prisma.notification.create({
        data: {
          patientId: params.patientId,
          appointmentId: params.appointmentId,
          channel: NotificationChannel.CALL,
          status: NotificationStatus.PENDING,
          message: 'Appel H-24 confirmation RDV',
          scheduledAt: reminderAt,
        },
      });

      const jobData: CallReminderJobData = {
        notificationId: notification.id,
        appointmentId: params.appointmentId,
        patientId: params.patientId,
        establishmentId: params.establishmentId,
      };

      await this.queue.add(CALL_REMINDER_JOB_NAME, jobData, {
        jobId: `${CALL_REMINDER_JOB_ID_PREFIX}${params.appointmentId}`,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(
        `H-24 call scheduled for appointment ${params.appointmentId} at ${reminderAt.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule H-24 call for appointment ${params.appointmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async cancelReminder(appointmentId: string): Promise<void> {
    const jobId = `${CALL_REMINDER_JOB_ID_PREFIX}${appointmentId}`;

    try {
      const bullJob = await this.queue.getJob(jobId);
      if (bullJob) {
        const state = await bullJob.getState();
        if (['delayed', 'waiting', 'paused'].includes(state)) {
          const { notificationId } = bullJob.data as CallReminderJobData;
          await bullJob.remove();
          if (notificationId) {
            await this.prisma.notification.deleteMany({
              where: { id: notificationId, status: NotificationStatus.PENDING },
            });
          }
          this.logger.log(`H-24 call job cancelled for appointment ${appointmentId}`);
          return;
        }
      }

      const notification = await this.prisma.notification.findFirst({
        where: {
          appointmentId,
          channel: NotificationChannel.CALL,
          externalId: { not: null },
          status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, externalId: true },
      });

      if (notification?.externalId) {
        await this.gomobile.cancelCall(notification.externalId);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.FAILED },
        });
        await this.prisma.appointment.update({
          where: { id: appointmentId },
          data: { gomobileCallStatus: 'cancelled' },
        });
        this.logger.log(
          `GoMobile call ${notification.externalId} cancelled for appointment ${appointmentId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to cancel H-24 call for appointment ${appointmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
