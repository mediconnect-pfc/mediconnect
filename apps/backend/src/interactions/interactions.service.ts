import { Injectable } from '@nestjs/common';
import { InteractionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPatient(
    patientId: string,
    establishmentId: string | null,
    page: number,
    limit: number,
    type?: InteractionType,
  ) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.max(limit, 1);
    const skip = (safePage - 1) * safeLimit;

    const where: any = {
      patientId,
      patient: {
        deletedAt: null,
        ...(establishmentId ? { establishmentId } : {}),
      },
      ...(type ? { type } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.interaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.interaction.count({ where }),
    ]);

    return {
      data,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
