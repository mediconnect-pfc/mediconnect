import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(
    establishmentId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where: { establishmentId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          appointments: { take: 1, orderBy: { slot: 'desc' } },
        },
      }),
      this.prisma.patient.count({ where: { establishmentId, deletedAt: null } }),
    ]);

    return {
      data: data.map(({ appointments, ...p }) => ({
        ...p,
        lastAppointment: appointments[0]?.slot?.toISOString() ?? null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, establishmentId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, establishmentId, deletedAt: null },
      include: {
        appointments: { orderBy: { slot: 'desc' } },
        interactions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    return patient;
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone: string;
    birthDate?: string | null;
    address?: string | null;
    tags?: string[];
    establishmentId: string;
  }) {
    const patient = await this.prisma.patient.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? undefined,
        phone: data.phone,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        address: data.address ?? undefined,
        tags: data.tags ?? [],
        establishmentId: data.establishmentId,
        portalToken: crypto.randomUUID(),
        portalTokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    return patient;
  }

  async update(
    id: string,
    establishmentId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string;
      birthDate?: string | null;
      address?: string | null;
      tags?: string[];
    },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, establishmentId, deletedAt: null },
    });
    if (!patient) return null;

    return this.prisma.patient.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email ?? undefined }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.birthDate !== undefined && { birthDate: data.birthDate ? new Date(data.birthDate) : undefined }),
        ...(data.address !== undefined && { address: data.address ?? undefined }),
        ...(data.tags !== undefined && { tags: data.tags }),
      },
    });
  }

  async remove(id: string, establishmentId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, establishmentId, deletedAt: null },
    });
    if (!patient) return false;

    await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }

  async search(
    establishmentId: string,
    q: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const where = {
      establishmentId,
      deletedAt: null,
      OR: [
        { firstName: { contains: q, mode: 'insensitive' as const } },
        { lastName: { contains: q, mode: 'insensitive' as const } },
        { phone: { contains: q } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async import(
    establishmentId: string,
    rows: { firstName: string; lastName: string; phone: string; birthDate?: string | null; tags?: string }[],
  ) {
    const errors: { row: number; message: string }[] = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.firstName || !row.lastName || !row.phone) {
          errors.push({ row: i + 1, message: 'Champs requis manquants' });
          continue;
        }

        const tags = row.tags
          ? row.tags.split(/[,|]/).map((t) => t.trim()).filter(Boolean)
          : [];

        await this.prisma.patient.create({
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
            birthDate: row.birthDate ? new Date(row.birthDate) : undefined,
            tags,
            establishmentId,
            portalToken: crypto.randomUUID(),
            portalTokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
        imported++;
      } catch (err: any) {
        errors.push({ row: i + 1, message: err.message || 'Erreur inconnue' });
      }
    }

    return { total: rows.length, imported, errors };
  }

  async generatePortalToken(id: string, establishmentId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, establishmentId, deletedAt: null },
    });
    if (!patient) return null;

    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await this.prisma.patient.update({
      where: { id },
      data: { portalToken: token, portalTokenExpiry: expiry },
    });

    return { token, expiresAt: expiry.toISOString() };
  }
}
