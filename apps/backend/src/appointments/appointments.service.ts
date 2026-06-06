import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientPortalService } from '../patient-portal/patient-portal.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { FilterAppointmentDto } from './dto/filter-appointment.dto';
import { AppointmentStatus } from '../../generated/prisma';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientPortalService: PatientPortalService,
  ) {}

  // Vue liste des RDV du jour avec filtres
  async findTodayAppointments(filters: FilterAppointmentDto) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const targetDate = filters.date ? new Date(filters.date) : null;

    const where: any = {
      date: targetDate
        ? {
            gte: new Date(new Date(filters.date).setHours(0, 0, 0, 0)),
            lte: new Date(new Date(filters.date).setHours(23, 59, 59, 999)),
          }
        : { gte: startOfDay, lte: endOfDay },
    };

    if (filters.doctorName) where.doctorName = { contains: filters.doctorName, mode: 'insensitive' };
    if (filters.establishmentId) where.establishmentId = filters.establishmentId;

    return this.prisma.appointment.findMany({
      where,
      include: { patient: true },
      orderBy: { date: 'asc' },
    });
  }

  // Créer un nouveau RDV + générer token JWT patient
  async create(dto: CreateAppointmentDto) {
    const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient introuvable');

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        establishmentId: dto.establishmentId,
        doctorName: dto.doctorName,
        date: new Date(dto.date),
      },
      include: { patient: true },
    });

    // Générer le token JWT automatiquement à la création
    const token = await this.patientPortalService.generatePortalToken(appointment.id);
    const portalLink = `https://mediconnect.ma/patient?token=${token}`;

    return { ...appointment, portalLink };
  }

  // Confirmer un RDV depuis la liste
  async confirm(id: string) {
    await this.findOne(id);
    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
      include: { patient: true },
    });
  }

  // Annuler un RDV depuis la liste
  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
      include: { patient: true },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!appointment) throw new NotFoundException(`RDV #${id} introuvable`);
    return appointment;
  }
}
