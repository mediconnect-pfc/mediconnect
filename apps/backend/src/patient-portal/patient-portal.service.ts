import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, ConfirmationStatus } from '@prisma/client';
import { AppointmentsAuditService } from '../appointments/appointments-audit.service';
import { SmsReminderService } from '../notifications/sms-reminder.service';
import { CallReminderService } from '../notifications/call-reminder.service';
import { randomBytes } from 'crypto';

const PORTAL_TOKEN_BYTES = 18;
const PORTAL_TOKEN_TTL_DAYS = 7;

@Injectable()
export class PatientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AppointmentsAuditService,
    private readonly smsReminderService: SmsReminderService,
    private readonly callReminderService: CallReminderService,
  ) {}

  async generatePortalToken(appointmentId: string): Promise<string> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true },
    });

    if (!appointment) {
      throw new NotFoundException(`RDV #${appointmentId} introuvable`);
    }

    const token = await this.generateUniqueOpaqueToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PORTAL_TOKEN_TTL_DAYS);

    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { portalToken: token, tokenExpiresAt: expiresAt },
    });

    return token;
  }

  async getPortalData(token: string) {
    const appointment = await this.validateToken(token);

    const patient = await this.prisma.patient.findUnique({
      where: { id: appointment.patientId },
      include: {
        appointments: {
          include: { doctor: { select: { name: true } } },
          orderBy: { slot: 'asc' },
        },
        interactions: {
          where: { type: { in: ['SMS', 'CALL'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient introuvable');
    }

    const now = new Date();
    const currentAppointment = patient.appointments.find((a) => a.id === appointment.id) ?? null;
    const nextAppointment =
      patient.appointments.find(
        (a) =>
          a.id !== appointment.id &&
          a.slot > now &&
          a.status === AppointmentStatus.SCHEDULED,
      ) ?? null;

    return {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
      },
      currentAppointment: currentAppointment
        ? {
            id: currentAppointment.id,
            doctorName: currentAppointment.doctor.name,
            date: currentAppointment.slot,
            status: currentAppointment.status,
          }
        : null,
      nextAppointment: nextAppointment
        ? {
            id: nextAppointment.id,
            doctorName: nextAppointment.doctor.name,
            date: nextAppointment.slot,
            status: nextAppointment.status,
          }
        : null,
      appointments: patient.appointments.map((a) => ({
        id: a.id,
        doctorName: a.doctor.name,
        date: a.slot,
        status: a.status,
      })),
      smsHistory: patient.interactions.map((i) => ({
        id: i.id,
        message: i.transcript ?? (i.type === 'CALL' ? 'Appel reçu' : 'Message SMS'),
        sentAt: i.createdAt,
        type: i.type,
      })),
    };
  }

  async confirmAppointment(id: string, token: string) {
    const tokenAppointment = await this.validateToken(token);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!appointment) throw new NotFoundException(`RDV introuvable`);
    if (appointment.patientId !== tokenAppointment.patientId) {
      throw new UnauthorizedException('Accès refusé');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CONFIRMED,
        confirmation: ConfirmationStatus.CONFIRMED,
        source: 'portal',
      },
    });

    await this.auditService.logStatusChange({
      userId: appointment.doctorId,
      establishmentId: appointment.patient.establishmentId,
      appointmentId: id,
      action: 'APPOINTMENT_CONFIRMED',
      previousStatus: appointment.status,
      newStatus: AppointmentStatus.CONFIRMED,
      details: { actor: 'patient', patientId: appointment.patientId },
    });

    return updated;
  }

  async cancelAppointment(id: string, token: string) {
    const tokenAppointment = await this.validateToken(token);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!appointment) throw new NotFoundException(`RDV introuvable`);
    if (appointment.patientId !== tokenAppointment.patientId) {
      throw new UnauthorizedException('Accès refusé');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        confirmation: ConfirmationStatus.CANCELLED,
        source: 'portal',
      },
    });

    await this.auditService.logStatusChange({
      userId: appointment.doctorId,
      establishmentId: appointment.patient.establishmentId,
      appointmentId: id,
      action: 'APPOINTMENT_CANCELLED',
      previousStatus: appointment.status,
      newStatus: AppointmentStatus.CANCELLED,
      details: { actor: 'patient', patientId: appointment.patientId },
    });

    void this.smsReminderService.cancelReminder(id);
    void this.callReminderService.cancelReminder(id);

    return updated;
  }

  private async validateToken(token: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { portalToken: token },
    });

    if (!appointment) throw new UnauthorizedException('Token invalide');

    if (!appointment.tokenExpiresAt || appointment.tokenExpiresAt < new Date()) {
      throw new UnauthorizedException('Token expiré');
    }

    return appointment;
  }

  private async generateUniqueOpaqueToken(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const token = randomBytes(PORTAL_TOKEN_BYTES).toString('base64url');
      const existing = await this.prisma.appointment.findUnique({
        where: { portalToken: token },
        select: { id: true },
      });
      if (!existing) return token;
    }

    throw new Error('Unable to generate a unique portal token');
  }
}
