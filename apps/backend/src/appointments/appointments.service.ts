import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientPortalService } from '../patient-portal/patient-portal.service';
import { AppointmentsAuditService } from './appointments-audit.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FilterAppointmentDto } from './dto/filter-appointment.dto';
import { AppointmentStatus, Prisma, UserRole } from '@prisma/client';

const appointmentInclude = {
  patient: true,
  doctor: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientPortalService: PatientPortalService,
    private readonly auditService: AppointmentsAuditService,
  ) {}

  private buildPortalLink(token: string) {
    const base = (process.env.FRONTEND_URL || 'http://localhost:3002').replace(/\/$/, '');
    return `${base}/patient?token=${encodeURIComponent(token)}`;
  }

  private dayRange(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

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

  async findAll(establishmentId: string, filters: FilterAppointmentDto = {}) {
    const where: Prisma.AppointmentWhereInput = {
      patient: { establishmentId, deletedAt: null },
    };

    if (filters.date) {
      const { start, end } = this.dayRange(new Date(filters.date));
      where.slot = { gte: start, lte: end };
    }

    if (filters.doctorId) where.doctorId = filters.doctorId;

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { slot: 'asc' },
    });

    return appointments.map((appointment) => this.toResponse(appointment));
  }

  async findToday(establishmentId: string, doctorId?: string) {
    const { start, end } = this.dayRange(new Date());
    const where: Prisma.AppointmentWhereInput = {
      patient: { establishmentId, deletedAt: null },
      slot: { gte: start, lte: end },
    };
    if (doctorId) where.doctorId = doctorId;

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { slot: 'asc' },
    });

    return appointments.map((appointment) => this.toResponse(appointment));
  }

  async findByDoctor(establishmentId: string, doctorId: string, filters: FilterAppointmentDto = {}) {
    await this.ensureDoctor(establishmentId, doctorId);

    const where: Prisma.AppointmentWhereInput = {
      doctorId,
      patient: { establishmentId, deletedAt: null },
    };

    if (filters.date) {
      const { start, end } = this.dayRange(new Date(filters.date));
      where.slot = { gte: start, lte: end };
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { slot: 'asc' },
    });

    return appointments.map((appointment) => this.toResponse(appointment));
  }

  async findOne(establishmentId: string, id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment || appointment.patient.establishmentId !== establishmentId) {
      throw new NotFoundException(`RDV #${id} introuvable`);
    }
    return this.toResponse(appointment);
  }

  async create(establishmentId: string, dto: CreateAppointmentDto, userId: string) {
    await this.ensurePatient(establishmentId, dto.patientId);
    await this.ensureDoctor(establishmentId, dto.doctorId);

    const slot = this.parseSlot(dto.date, dto.time);

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        slot,
        source: dto.source ?? 'manual',
        notes: dto.notes,
      },
      include: appointmentInclude,
    });

    const token = await this.patientPortalService.generatePortalToken(appointment.id);
    const portalLink = this.buildPortalLink(token);

    await this.auditService.logStatusChange({
      userId,
      establishmentId,
      appointmentId: appointment.id,
      action: 'APPOINTMENT_CREATED',
      previousStatus: AppointmentStatus.SCHEDULED,
      newStatus: AppointmentStatus.SCHEDULED,
      details: { source: appointment.source },
    });

    return { ...this.toResponse(appointment), portalLink };
  }

  async update(establishmentId: string, id: string, dto: UpdateAppointmentDto, userId: string) {
    const existing = await this.getAppointmentEntity(establishmentId, id);

    if (dto.patientId) await this.ensurePatient(establishmentId, dto.patientId);
    if (dto.doctorId) await this.ensureDoctor(establishmentId, dto.doctorId);

    const slot =
      dto.date || dto.time
        ? this.parseSlot(
            dto.date ?? existing.slot.toISOString().slice(0, 10),
            dto.time ?? existing.slot.toISOString().slice(11, 16),
          )
        : undefined;

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        slot,
        notes: dto.notes,
        source: dto.source,
      },
      include: appointmentInclude,
    });

    await this.auditService.logUpdate({
      userId,
      establishmentId,
      appointmentId: id,
      details: { changes: dto },
    });

    return this.toResponse(appointment);
  }

  async remove(establishmentId: string, id: string, userId: string) {
    return this.changeStatus(establishmentId, id, AppointmentStatus.CANCELLED, userId, 'APPOINTMENT_CANCELLED');
  }

  async confirm(establishmentId: string, id: string, userId: string) {
    return this.changeStatus(establishmentId, id, AppointmentStatus.CONFIRMED, userId, 'APPOINTMENT_CONFIRMED');
  }

  async cancel(establishmentId: string, id: string, userId: string) {
    return this.changeStatus(establishmentId, id, AppointmentStatus.CANCELLED, userId, 'APPOINTMENT_CANCELLED');
  }

  async markNoShow(establishmentId: string, id: string, userId: string) {
    return this.changeStatus(establishmentId, id, AppointmentStatus.NO_SHOW, userId, 'APPOINTMENT_NO_SHOW');
  }

  async complete(establishmentId: string, id: string, userId: string) {
    return this.changeStatus(establishmentId, id, AppointmentStatus.COMPLETED, userId, 'APPOINTMENT_COMPLETED');
  }

  private async changeStatus(
    establishmentId: string,
    id: string,
    status: AppointmentStatus,
    userId: string,
    action: string,
  ) {
    const existing = await this.getAppointmentEntity(establishmentId, id);

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: { status },
      include: appointmentInclude,
    });

    await this.auditService.logStatusChange({
      userId,
      establishmentId,
      appointmentId: id,
      action,
      previousStatus: existing.status,
      newStatus: status,
    });

    return this.toResponse(appointment);
  }

  private async getAppointmentEntity(establishmentId: string, id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!appointment || appointment.patient.establishmentId !== establishmentId) {
      throw new NotFoundException(`RDV #${id} introuvable`);
    }
    return appointment;
  }

  private async ensurePatient(establishmentId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, establishmentId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Patient introuvable');
    return patient;
  }

  private async ensureDoctor(establishmentId: string, doctorId: string) {
    const doctor = await this.prisma.user.findFirst({
      where: { id: doctorId, establishmentId, role: UserRole.DOCTOR, isActive: true },
    });
    if (!doctor) throw new NotFoundException('Médecin introuvable');
    return doctor;
  }

  private parseSlot(date: string, time: string) {
    const slot = new Date(`${date}T${time}`);
    if (Number.isNaN(slot.getTime())) {
      throw new BadRequestException('Date ou heure invalide');
    }
    return slot;
  }

  private toResponse(
    appointment: Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>,
  ) {
    return {
      id: appointment.id,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctor.name,
      date: appointment.slot,
      status: appointment.status,
      source: appointment.source,
      notes: appointment.notes,
      patient: {
        id: appointment.patient.id,
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        phone: appointment.patient.phone,
      },
      ...(appointment.portalToken
        ? { portalLink: this.buildPortalLink(appointment.portalToken) }
        : {}),
    };
  }
}
