import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Direction, InteractionType, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsGateway } from '../appointments/appointments.gateway';
import { GomobileApiError, GomobileService } from './gomobile.service';

export interface SmsDeliveryJobData {
  notificationId: string;
  appointmentId: string;
  patientId: string;
  phone: string;
  message: string;
}

@Injectable()
export class SmsDeliveryService {
  private readonly logger = new Logger(SmsDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gomobile: GomobileService,
    private readonly gateway: AppointmentsGateway,
  ) {}

  async processJob(
    job: Job<SmsDeliveryJobData>,
    options?: { beforeSend?: () => Promise<boolean> },
  ): Promise<void> {
    const { notificationId, appointmentId, patientId, phone, message } = job.data;

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found — skipping`);
      return;
    }

    if (
      notification.status === NotificationStatus.SENT ||
      notification.status === NotificationStatus.DELIVERED ||
      notification.status === NotificationStatus.FAILED
    ) {
      this.logger.log(`SMS already processed for appointment ${appointmentId} — skipping`);
      return;
    }

    if (options?.beforeSend) {
      const shouldSend = await options.beforeSend();
      if (!shouldSend) {
        await this.prisma.notification.delete({ where: { id: notificationId } }).catch(() => undefined);
        this.logger.log(`SMS skipped for appointment ${appointmentId}`);
        return;
      }
    }

    try {
      const result = await this.gomobile.sendSms(phone, message);
      const sentAt = new Date();
      const externalId = result.smsLogId ?? result.messageId ?? undefined;

      const [, interaction] = await this.prisma.$transaction([
        this.prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.DELIVERED,
            sentAt,
            externalId,
          },
        }),
        this.prisma.interaction.create({
          data: {
            patientId,
            type: InteractionType.SMS,
            direction: Direction.OUTBOUND,
            transcript: message,
            externalId: result.messageId ?? result.smsLogId ?? undefined,
          },
        }),
      ]);

      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, firstName: true, lastName: true, phone: true, establishmentId: true },
      });

      if (patient) {
        this.gateway.emitInteractionNew({
          interactionId: interaction.id,
          establishmentId: patient.establishmentId,
          patient: {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            phone: patient.phone,
          },
          type: interaction.type,
          direction: interaction.direction,
          transcript: interaction.transcript,
          intent: interaction.intent,
          createdAt: interaction.createdAt,
        });
      }

      this.logger.log(
        `SMS sent for appointment ${appointmentId} (smsLogId=${result.smsLogId ?? 'n/a'})`,
      );
    } catch (error) {
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;

      if (error instanceof GomobileApiError && !error.retryable) {
        await this.markFailed(notificationId, error.message);
        return;
      }

      if (isLastAttempt) {
        const reason = error instanceof Error ? error.message : 'SMS send failed';
        await this.markFailed(notificationId, reason);
        return;
      }

      throw error;
    }
  }

  private async markFailed(notificationId: string, reason: string) {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.FAILED },
    });
    this.logger.error(`SMS failed for notification ${notificationId}: ${reason}`);
  }
}
