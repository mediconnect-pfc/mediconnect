import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  AppointmentStatus,
  ConfirmationStatus,
  Direction,
  InteractionType,
  NotificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsGateway } from '../appointments/appointments.gateway';
import { GomobileApiError, GomobileService } from './gomobile.service';
import {
  buildCallTranscript,
  mapCallPatientAction,
} from './call-result.mapper';
import { zonedDateInput, zonedTimeInput } from '../common/timezone';
import {
  CALL_POLL_INTERVAL_MS,
  CALL_POLL_MAX_WAIT_MS,
  CALL_REMINDER_QUEUE,
} from './call-reminder.constants';
import type { CallReminderJobData } from './call-reminder.service';

@Processor(CALL_REMINDER_QUEUE, { lockDuration: 900_000 })
export class CallReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(CallReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gomobile: GomobileService,
    private readonly gateway: AppointmentsGateway,
  ) {
    super();
  }

  async process(job: Job<CallReminderJobData>): Promise<void> {
    const { notificationId, appointmentId, patientId, establishmentId } = job.data;

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { establishment: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!appointment) {
      this.logger.warn(`Appointment ${appointmentId} not found — skipping call`);
      return;
    }

    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.NO_SHOW
    ) {
      await this.prisma.notification.delete({ where: { id: notificationId } }).catch(() => undefined);
      this.logger.log(`Appointment ${appointmentId} not eligible for call — skipping`);
      return;
    }

    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();
    const appointmentDate = zonedDateInput(appointment.slot);
    const appointmentTime = zonedTimeInput(appointment.slot);
    const clinicName = appointment.patient.establishment.name;

    try {
      const { jobId } = await this.gomobile.triggerCallByPhone({
        phone: appointment.patient.phone,
        fullName: patientName,
        attributes: {
          appointmentId: appointment.id,
          appointmentDate,
          appointmentTime,
          doctorName: appointment.doctor.name,
          clinicName,
          patientName: appointment.patient.firstName,
          language: 'darija',
        },
      });

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { externalId: jobId, status: NotificationStatus.SENT, sentAt: new Date() },
      });
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { gomobileJobId: jobId, gomobileCallStatus: 'sent' },
      });

      const report = await this.gomobile.pollCallReport(jobId, {
        intervalMs: CALL_POLL_INTERVAL_MS,
        maxWaitMs: CALL_POLL_MAX_WAIT_MS,
      });

      const lastAttempt = report.attempts?.[report.attempts.length - 1];
      const finalVariables = lastAttempt?.flowExecution?.finalVariables;
      const returnedAppointmentId = finalVariables?.['appointmentId'] as string | undefined;
      if (returnedAppointmentId && returnedAppointmentId !== appointmentId) {
        this.logger.warn(
          `appointmentId mismatch in call report: expected ${appointmentId}, got ${returnedAppointmentId}`,
        );
      }

      const action = mapCallPatientAction(finalVariables, report.finalOutcome ?? lastAttempt?.outcome);
      const dtmf = finalVariables?.['dtmf.response'] as string | undefined;
      const callId = lastAttempt?.callId;
      const durationMs = lastAttempt?.call?.durationMs;

      const transcript = buildCallTranscript({
        action,
        dtmf,
        doctorName: appointment.doctor.name,
        appointmentDate,
        appointmentTime,
        durationMs,
      });

      const appointmentUpdate = this.mapAppointmentUpdate(action);

      const [updatedAppointment, , interaction] = await this.prisma.$transaction([
        this.prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            ...appointmentUpdate,
            gomobileJobId: jobId,
            gomobileCallStatus: report.status,
          },
        }),
        this.prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: report.status === 'completed' ? NotificationStatus.DELIVERED : NotificationStatus.FAILED,
          },
        }),
        this.prisma.interaction.create({
          data: {
            patientId,
            type: InteractionType.CALL,
            direction: Direction.OUTBOUND,
            transcript,
            intent: action,
            duration: durationMs ? Math.round(durationMs / 1000) : undefined,
            externalId: callId ?? jobId,
          },
        }),
      ]);

      const patientPayload = {
        id: appointment.patient.id,
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        phone: appointment.patient.phone,
      };

      this.gateway.emitInteractionNew({
        interactionId: interaction.id,
        establishmentId,
        patient: patientPayload,
        type: interaction.type,
        direction: interaction.direction,
        transcript: interaction.transcript,
        intent: interaction.intent,
        createdAt: interaction.createdAt,
      });

      const todayCounts = await this.getTodayCounts(establishmentId);
      const appointmentEventPayload = {
        appointmentId,
        establishmentId,
        status: updatedAppointment.status,
        action: `CALL_${action.toUpperCase()}`,
        date: appointment.slot,
        doctorName: appointment.doctor.name,
        patient: patientPayload,
        todayCounts,
        ...(updatedAppointment.status === AppointmentStatus.CONFIRMED
          ? { badge: { label: 'Confirme', variant: 'success' as const } }
          : {}),
        ...(updatedAppointment.status === AppointmentStatus.CANCELLED
          ? {
              badge: { label: 'Annule', variant: 'danger' as const },
              notification: {
                title: 'Rendez-vous annule',
                message: `${patientName} a annule son rendez-vous.`,
              },
            }
          : {}),
      };

      this.gateway.emitAppointmentUpdated(appointmentEventPayload);
      if (updatedAppointment.status === AppointmentStatus.CONFIRMED) {
        this.gateway.emitAppointmentConfirmed(appointmentEventPayload);
      }
      if (updatedAppointment.status === AppointmentStatus.CANCELLED) {
        this.gateway.emitAppointmentCancelled(appointmentEventPayload);
      }
      this.logger.log(`H-24 call completed for appointment ${appointmentId}: ${action}`);
    } catch (error) {
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;

      if (error instanceof GomobileApiError && !error.retryable) {
        await this.markFailed(notificationId, appointmentId, error.message);
        return;
      }

      if (isLastAttempt) {
        const reason = error instanceof Error ? error.message : 'Call failed';
        await this.markFailed(notificationId, appointmentId, reason);
        return;
      }

      throw error;
    }
  }

  private mapAppointmentUpdate(action: ReturnType<typeof mapCallPatientAction>) {
    switch (action) {
      case 'confirmed':
        return {
          status: AppointmentStatus.CONFIRMED,
          confirmation: ConfirmationStatus.CONFIRMED,
          source: 'call',
        };
      case 'cancelled':
        return {
          status: AppointmentStatus.CANCELLED,
          confirmation: ConfirmationStatus.CANCELLED,
          source: 'call',
        };
      default:
        return {};
    }
  }

  private async markFailed(notificationId: string, appointmentId: string, reason: string) {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.FAILED },
    });
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { gomobileCallStatus: 'failed' },
    });
    this.logger.error(`H-24 call failed for notification ${notificationId}: ${reason}`);
  }

  private async getTodayCounts(establishmentId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        patient: { establishmentId, deletedAt: null },
        slot: { gte: start, lte: end },
      },
      select: { status: true },
    });

    return {
      total: appointments.length,
      scheduled: appointments.filter((appointment) => appointment.status === AppointmentStatus.SCHEDULED).length,
      confirmed: appointments.filter((appointment) => appointment.status === AppointmentStatus.CONFIRMED).length,
      cancelled: appointments.filter((appointment) => appointment.status === AppointmentStatus.CANCELLED).length,
      completed: appointments.filter((appointment) => appointment.status === AppointmentStatus.COMPLETED).length,
      noShow: appointments.filter((appointment) => appointment.status === AppointmentStatus.NO_SHOW).length,
    };
  }
}
