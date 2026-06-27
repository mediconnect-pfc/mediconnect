import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { KpiResponse } from './interfaces/kpi.interface';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async computeKpis(
    startDate: string,
    endDate: string,
    establishmentId?: string | null,
  ): Promise<KpiResponse> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dateFilter = { gte: start, lte: end };
    const appointmentWhere = establishmentId
      ? {
          slot: dateFilter,
          patient: { establishmentId, deletedAt: null },
        }
      : { slot: dateFilter };
    const campaignWhere = establishmentId
      ? {
          createdAt: dateFilter,
          campaign: { establishmentId },
        }
      : { createdAt: dateFilter };

    const [totalAppointments, confirmedAppointments, cancelledAppointments, totalSMSSent] =
      await Promise.all([
        this.prisma.appointment.count({
          where: appointmentWhere,
        }),
        this.prisma.appointment.count({
          where: { ...appointmentWhere, status: 'CONFIRMED' },
        }),
        this.prisma.appointment.count({
          where: { ...appointmentWhere, status: 'CANCELLED' },
        }),
        this.prisma.campaignMessage.count({
          where: campaignWhere,
        }),
      ]);

    const confirmationRate =
      totalAppointments > 0
        ? Math.round((confirmedAppointments / totalAppointments) * 1000) / 10
        : 0;

    const cancellationRate =
      totalAppointments > 0
        ? Math.round((cancelledAppointments / totalAppointments) * 1000) / 10
        : 0;

    return {
      period: { startDate, endDate },
      metrics: {
        totalAppointments,
        confirmationRate,
        cancellationRate,
        totalSMSSent,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
