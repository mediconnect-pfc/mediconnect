import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientPortalService } from '../patient-portal/patient-portal.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { FilterAppointmentDto } from './dto/filter-appointment.dto';
import { AppointmentStatus, Prisma, UserRole } from '@prisma/client';
import { AppointmentsGateway } from './appointments.gateway';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientPortalService: PatientPortalService,
    private readonly appointmentsGateway: AppointmentsGateway,
  ) {}

  async getOptions(establishmentId: string) {
    const [patients, doctors] = await Promise.all([
      this.prisma.patient.findMany({
        where: { establishmentId, deletedAt: null },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        select: { id: true, firstName: true, lastName: true, phone: true },
      }),
      this.prisma.user.findMany({
        where: { establishmentId, role: UserRole.DOCTOR, isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    ]);

    return { patients, doctors };
  }

  async findTodayAppointments(establishmentId: string, filters: FilterAppointmentDto) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const where: Prisma.AppointmentWhereInput = {
      patient: { establishmentId, deletedAt: null },
    };

    if (filters.date) {
      where.slot = {
        gte: new Date(new Date(filters.date).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(filters.date).setHours(23, 59, 59, 999)),
      };
    } else {
      where.slot = { gte: startOfDay, lte: endOfDay };
    }

    if (filters.doctorId) where.doctorId = filters.doctorId;

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: { patient: true, doctor: { select: { id: true, name: true } } },
      orderBy: { slot: 'asc' },
    });

    return appointments.map((appointment) => this.toResponse(appointment));
  }

  async create(establishmentId: string, dto: CreateAppointmentDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, establishmentId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Patient introuvable');

    const doctor = await this.prisma.user.findFirst({
      where: {
        id: dto.doctorId,
        establishmentId,
        role: UserRole.DOCTOR,
        isActive: true,
      },
    });
    if (!doctor) throw new NotFoundException('Médecin introuvable');

    const slot = new Date(`${dto.date}T${dto.time}`);
    if (Number.isNaN(slot.getTime())) {
      throw new BadRequestException('Date ou heure invalide');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        slot,
      },
      include: { patient: true, doctor: { select: { id: true, name: true } } },
    });

    const token = await this.patientPortalService.generatePortalToken(appointment.id);
    const portalLink = `https://mediconnect.ma/patient?token=${token}`;

    this.appointmentsGateway.emitUpdated(establishmentId);

    return { ...this.toResponse(appointment), portalLink };
  }

  async confirm(establishmentId: string, id: string) {
    await this.findOne(establishmentId, id);
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
      include: { patient: true, doctor: { select: { id: true, name: true } } },
    });
    this.appointmentsGateway.emitUpdated(establishmentId);
    return this.toResponse(appointment);
  }

  async cancel(establishmentId: string, id: string) {
    await this.findOne(establishmentId, id);
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
      include: { patient: true, doctor: { select: { id: true, name: true } } },
    });
    this.appointmentsGateway.emitUpdated(establishmentId);
    return this.toResponse(appointment);
  }

  async findOne(establishmentId: string, id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, doctor: { select: { id: true, name: true } } },
    });
    if (!appointment || appointment.patient.establishmentId !== establishmentId) {
      throw new NotFoundException(`RDV #${id} introuvable`);
    }
    return appointment;
  }

  private toResponse(
    appointment: Prisma.AppointmentGetPayload<{
      include: { patient: true; doctor: { select: { id: true; name: true } } };
    }>,
  ) {
    return {
      id: appointment.id,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctor.name,
      date: appointment.slot,
      status: appointment.status,
      patient: {
        id: appointment.patient.id,
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        phone: appointment.patient.phone,
      },
    };
  }
}