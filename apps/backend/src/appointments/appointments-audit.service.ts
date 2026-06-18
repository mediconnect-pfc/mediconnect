import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsGateway, type AppointmentRealtimePayload } from './appointments.gateway';

const appointmentEventInclude = {
  patient: true,
  doctor: { select: { name: true } },
} as const;

@Injectable()
export class AppointmentsAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppointmentsGateway,
  ) {}

  async logStatusChange(params: {
    userId: string;
    establishmentId: string;
    appointmentId: string;
    action: string;
    previousStatus: AppointmentStatus;
    newStatus: AppointmentStatus;
    details?: Record<string, unknown>;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resourceType: 'Appointment',
        resourceId: params.appointmentId,
        details: {
          previousStatus: params.previousStatus,
          newStatus: params.newStatus,
          establishmentId: params.establishmentId,
          ...params.details,
        },
      },
    });

    await this.emitAppointmentEvent({
      establishmentId: params.establishmentId,
      appointmentId: params.appointmentId,
      action: params.action,
      status: params.newStatus,
    });
  }

  async logUpdate(params: {
    userId: string;
    establishmentId: string;
    appointmentId: string;
    details?: Record<string, unknown>;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: 'APPOINTMENT_UPDATED',
        resourceType: 'Appointment',
        resourceId: params.appointmentId,
        details: {
          establishmentId: params.establishmentId,
          ...params.details,
        },
      },
    });

    await this.emitAppointmentEvent({
      establishmentId: params.establishmentId,
      appointmentId: params.appointmentId,
      action: 'APPOINTMENT_UPDATED',
    });
  }

  private async emitAppointmentEvent(params: {
    establishmentId: string;
    appointmentId: string;
    action: string;
    status?: AppointmentStatus;
  }) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: params.appointmentId },
      include: appointmentEventInclude,
    });

    if (!appointment) {
      this.gateway.emitUpdated(params.establishmentId);
      return;
    }

    const todayCounts = await this.getTodayCounts(params.establishmentId);
    const status = params.status ?? appointment.status;
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();

    const payload: AppointmentRealtimePayload = {
      appointmentId: appointment.id,
      establishmentId: params.establishmentId,
      status,
      action: params.action,
      date: appointment.slot,
      doctorName: appointment.doctor.name,
      patient: {
        id: appointment.patient.id,
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        phone: appointment.patient.phone,
      },
      todayCounts,
      ...(status === AppointmentStatus.CONFIRMED
        ? {
            badge: { label: 'Confirme', variant: 'success' as const },
          }
        : {}),
      ...(status === AppointmentStatus.CANCELLED
        ? {
            badge: { label: 'Annule', variant: 'danger' as const },
            notification: {
              title: 'Rendez-vous annule',
              message: `${patientName} a annule son rendez-vous.`,
            },
          }
        : {}),
    };

    this.gateway.emitAppointmentUpdated(payload);
    if (status === AppointmentStatus.CONFIRMED) {
      this.gateway.emitAppointmentConfirmed(payload);
    }
    if (status === AppointmentStatus.CANCELLED) {
      this.gateway.emitAppointmentCancelled(payload);
    }
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
