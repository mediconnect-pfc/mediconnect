import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '../../generated/prisma';

@Injectable()
export class PatientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Générer un token JWT unique pour un RDV
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

  // GET /patient/portal?token=xxx → données du patient
  async getPortalData(token: string) {
    const appointment = await this.validateToken(token);

    const patient = await this.prisma.patient.findUnique({
      where: { id: appointment.patientId },
      include: {
        appointments: { orderBy: { date: 'asc' } },
        smsLogs: { orderBy: { sentAt: 'desc' } },
      },
    });

    const now = new Date();
    const nextAppointment = patient.appointments.find(
      (a) => a.date > now && a.status !== AppointmentStatus.CANCELLED,
    ) || null;

    return {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
      },
      nextAppointment,
      appointments: patient.appointments,
      smsHistory: patient.smsLogs,
    };
  }

  // PATCH /patient/portal/rdv/:id/confirm
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

  // PATCH /patient/portal/rdv/:id/cancel
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

  // Valider le token et vérifier qu'il n'est pas expiré
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

    if (appointment.tokenExpiresAt < new Date()) {
      throw new UnauthorizedException('Token expiré');
    }

    return appointment;
  }
}
