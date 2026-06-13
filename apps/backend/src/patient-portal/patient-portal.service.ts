import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class PatientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
    });

    if (!appointment) throw new NotFoundException(`RDV introuvable`);
    if (appointment.patientId !== tokenAppointment.patientId) {
      throw new UnauthorizedException('Accès refusé');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
    });
  }

  async cancelAppointment(id: string, token: string) {
    const tokenAppointment = await this.validateToken(token);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) throw new NotFoundException(`RDV introuvable`);
    if (appointment.patientId !== tokenAppointment.patientId) {
      throw new UnauthorizedException('Accès refusé');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
    });
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
