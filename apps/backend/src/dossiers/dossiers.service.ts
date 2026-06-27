import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DossiersService {
  constructor(private readonly prisma: PrismaService) {}

  private buildPatientScope(establishmentId: string | null) {
    return establishmentId
      ? { establishmentId, deletedAt: null }
      : { deletedAt: null };
  }

  async create(params: {
    establishmentId: string | null;
    medecinId: string;
    patientId: string;
    notes?: string | null;
    ordonnance?: string | null;
  }) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: params.patientId,
        ...this.buildPatientScope(params.establishmentId),
      },
      select: { id: true, establishmentId: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient introuvable');
    }

    return this.prisma.dossierMedical.create({
      data: {
        patientId: patient.id,
        medecinId: params.medecinId,
        notes: params.notes ?? undefined,
        ordonnance: params.ordonnance ?? undefined,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        medecin: { select: { id: true, name: true, email: true, specialty: true } },
      },
    });
  }

  async findByPatient(establishmentId: string | null, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        ...this.buildPatientScope(establishmentId),
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient introuvable');
    }

    return this.prisma.dossierMedical.findMany({
      where: {
        patientId,
        patient: this.buildPatientScope(establishmentId),
      },
      orderBy: { consultationDate: 'desc' },
      include: {
        medecin: { select: { id: true, name: true, email: true, specialty: true } },
      },
    });
  }

  async findOne(establishmentId: string | null, id: string) {
    const dossier = await this.prisma.dossierMedical.findFirst({
      where: {
        id,
        patient: this.buildPatientScope(establishmentId),
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            establishmentId: true,
          },
        },
        medecin: { select: { id: true, name: true, email: true, specialty: true, role: true } },
      },
    });

    if (!dossier) {
      throw new NotFoundException('Dossier introuvable');
    }

    return dossier;
  }

  async update(params: {
    establishmentId: string | null;
    dossierId: string;
    medecinId: string;
    notes?: string | null;
    ordonnance?: string | null;
  }) {
    const dossier = await this.prisma.dossierMedical.findFirst({
      where: {
        id: params.dossierId,
        patient: this.buildPatientScope(params.establishmentId),
      },
      select: { id: true, medecinId: true },
    });

    if (!dossier) {
      throw new NotFoundException('Dossier introuvable');
    }

    if (dossier.medecinId !== params.medecinId) {
      throw new ForbiddenException('Seul le medecin createur peut modifier ce dossier');
    }

    return this.prisma.dossierMedical.update({
      where: { id: params.dossierId },
      data: {
        ...(params.notes !== undefined && { notes: params.notes }),
        ...(params.ordonnance !== undefined && { ordonnance: params.ordonnance }),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        medecin: { select: { id: true, name: true, email: true, specialty: true } },
      },
    });
  }

  async remove(params: {
    establishmentId: string | null;
    dossierId: string;
    medecinId: string;
  }) {
    const dossier = await this.prisma.dossierMedical.findFirst({
      where: {
        id: params.dossierId,
        patient: this.buildPatientScope(params.establishmentId),
      },
      select: { id: true, medecinId: true },
    });

    if (!dossier) {
      throw new NotFoundException('Dossier introuvable');
    }

    if (dossier.medecinId !== params.medecinId) {
      throw new ForbiddenException('Seul le medecin createur peut supprimer ce dossier');
    }

    const linkedAnalyses = await this.prisma.analyse.count({
      where: { dossierId: params.dossierId },
    });

    if (linkedAnalyses > 0) {
      throw new BadRequestException('Impossible de supprimer un dossier lie a des analyses');
    }

    await this.prisma.dossierMedical.delete({
      where: { id: params.dossierId },
    });

    return { success: true };
  }
}
