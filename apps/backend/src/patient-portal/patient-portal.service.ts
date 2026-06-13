import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';
import { AppointmentsAuditService } from '../appointments/appointments-audit.service';

@Injectable()
export class PatientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AppointmentsAuditService,
  ) {}

  async generatePortalToken(appointmentId: string): Promise<string> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true },
    });

    if (!appointment) {
      throw new NotFoundException(`RDV #${appointmentId} introuvable`);
    }

    const token = this.jwtService.sign(
      { appointmentId, patientId: appointment.patientId },
      { expiresIn: '7d' },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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
    const nextAppointment = patient.appointments.find(
      (a) => a.slot > now && a.status !== AppointmentStatus.CANCELLED,
    ) ?? null;

    return {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
      },
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
      data: { status: AppointmentStatus.CONFIRMED, source: 'portal' },
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
      data: { status: AppointmentStatus.CANCELLED, source: 'portal' },
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

    return updated;
  }

  private async validateToken(token: string) {
    try {
      this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { portalToken: token },
    });

    if (!appointment) throw new UnauthorizedException('Token invalide');

    if (!appointment.tokenExpiresAt || appointment.tokenExpiresAt < new Date()) {
      throw new UnauthorizedException('Token expiré');
    }

    return appointment;
  }
}
