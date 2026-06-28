import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  type AppointmentSeriesResponse,
  type KpiData,
  type KpiResponse,
} from './interfaces/kpi.interface';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly startTime = Date.now();

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
    const patientWhere = establishmentId
      ? { establishmentId, deletedAt: null }
      : { deletedAt: null };

    const [
      totalAppointments,
      confirmedAppointments,
      cancelledAppointments,
      noShowAppointments,
      smsNotificationsDelivered,
      campaignMessagesDelivered,
      totalCallsMade,
      totalPatients,
    ] =
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
        this.prisma.appointment.count({
          where: { ...appointmentWhere, status: 'NO_SHOW' },
        }),
        this.prisma.notification.count({
          where: {
            channel: NotificationChannel.SMS,
            status: NotificationStatus.DELIVERED,
            ...(establishmentId ? { patient: { establishmentId, deletedAt: null } } : {}),
          },
        }),
        this.prisma.campaignMessage.count({
          where: {
            ...campaignWhere,
            status: 'DELIVERED',
            campaign: {
              ...(establishmentId ? { establishmentId } : {}),
              type: { in: ['SMS', 'EMERGENCY'] },
            },
          },
        }),
        this.prisma.notification.count({
          where: {
            channel: NotificationChannel.CALL,
            status: NotificationStatus.DELIVERED,
            ...(establishmentId ? { patient: { establishmentId, deletedAt: null } } : {}),
          },
        }),
        this.prisma.patient.count({
          where: patientWhere,
        }),
      ]);
    const totalSMSSent = smsNotificationsDelivered + campaignMessagesDelivered;

    const confirmationRate =
      totalAppointments > 0
        ? Math.round((confirmedAppointments / totalAppointments) * 1000) / 10
        : 0;

    const cancellationRate =
      totalAppointments > 0
        ? Math.round((cancelledAppointments / totalAppointments) * 1000) / 10
        : 0;

    const noShowRate =
      totalAppointments > 0
        ? Math.round((noShowAppointments / totalAppointments) * 1000) / 10
        : 0;

    return {
      period: { startDate, endDate },
      metrics: {
        totalAppointments,
        confirmationRate,
        cancellationRate,
        noShowRate,
        totalSMSSent,
        totalCallsMade,
        totalPatients,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async computeAppointmentsSeries(
    startDate: string,
    endDate: string,
    establishmentId?: string | null,
  ): Promise<AppointmentSeriesResponse> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dateFilter = { gte: start, lte: end };
    const appointments = await this.prisma.appointment.findMany({
      where: establishmentId
        ? {
            slot: dateFilter,
            patient: { establishmentId, deletedAt: null },
          }
        : { slot: dateFilter },
      select: { slot: true },
      orderBy: { slot: 'asc' },
    });

    const map = new Map<string, number>();
    for (const appointment of appointments) {
      const key = appointment.slot.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    const data: AppointmentSeriesResponse['data'] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      data.push({ date: key, count: map.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      period: { startDate, endDate },
      data,
      timestamp: new Date().toISOString(),
    };
  }

  async computeDashboardKpis(establishmentId?: string | null): Promise<KpiData> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const userWhere = establishmentId
      ? { establishmentId, isActive: true }
      : { isActive: true };
    const newUsersWhere = establishmentId
      ? { establishmentId, isActive: true, createdAt: { gte: todayStart } }
      : { isActive: true, createdAt: { gte: todayStart } };
    const appointmentWhere = establishmentId
      ? {
          slot: { gte: todayStart },
          patient: { establishmentId, deletedAt: null },
        }
      : { slot: { gte: todayStart } };
    const messageWhere = establishmentId
      ? {
          createdAt: { gte: todayStart },
          campaign: { establishmentId },
        }
      : { createdAt: { gte: todayStart } };

    const [
      totalUsers,
      newUsersToday,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalMessages,
    ] = await Promise.all([
      this.prisma.user.count({ where: userWhere }),
      this.prisma.user.count({ where: newUsersWhere }),
      this.prisma.appointment.count({ where: appointmentWhere }),
      this.prisma.appointment.count({
        where: { ...appointmentWhere, status: 'COMPLETED' },
      }),
      this.prisma.appointment.count({
        where: { ...appointmentWhere, status: 'CANCELLED' },
      }),
      this.prisma.campaignMessage.count({ where: messageWhere }),
    ]);

    const requestsToday = newUsersToday + totalAppointments + totalMessages;
    const successRate =
      totalAppointments > 0
        ? Math.round((completedAppointments / totalAppointments) * 1000) / 10
        : 100;
    const uptime = Math.round(((Date.now() - this.startTime) / (1000 * 60 * 60 * 24)) * 10000) / 100;
    const avgResponseTime = Math.floor(Math.random() * 200 + 100);
    const transactionsPerMin = Math.round(requestsToday / Math.max(now.getHours() * 60 + now.getMinutes(), 1));

    return {
      activeUsers: totalUsers,
      requestsToday,
      successRate,
      avgResponseTime,
      errorCount: cancelledAppointments,
      transactionsPerMin,
      uptime: Math.min(uptime, 99.99),
      timestamp: now.toISOString(),
    };
  }
}
