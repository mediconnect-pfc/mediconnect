import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsGateway } from './appointments.gateway';

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

    this.gateway.emitUpdated(params.establishmentId);
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

    this.gateway.emitUpdated(params.establishmentId);
  }
}
