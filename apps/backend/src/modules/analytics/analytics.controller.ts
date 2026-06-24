import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AnalyticsService } from './analytics.service';
import { kpiQuerySchema } from './dto/kpi-query.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  private getEstablishmentId(user: AuthenticatedUser): string | null {
    if (!user.establishmentId && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Utilisateur sans etablissement');
    }

    return user.establishmentId;
  }

  @Get('kpis')
  async getKpis(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsed = kpiQuerySchema.safeParse({ startDate, endDate });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return this.service.computeKpis(
      parsed.data.startDate,
      parsed.data.endDate,
      this.getEstablishmentId(user),
    );
  }

  @Get('export')
  async exportAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query('format') format?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (format !== 'csv' && format !== 'pdf') {
      throw new BadRequestException('format doit etre csv ou pdf');
    }
    const parsed = kpiQuerySchema.safeParse({ startDate: dateFrom, endDate: dateTo });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const kpis = await this.service.computeKpis(
      parsed.data.startDate,
      parsed.data.endDate,
      this.getEstablishmentId(user),
    );

    const filename = `analytics-${parsed.data.startDate}-${parsed.data.endDate}.${format}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const stringifier = stringify({
        header: true,
        columns: ['periodStart', 'periodEnd', 'totalAppointments', 'confirmationRate', 'cancellationRate', 'totalSMSSent', 'timestamp'],
      });

      stringifier.pipe(res);
      stringifier.write({
        periodStart: kpis.period.startDate,
        periodEnd: kpis.period.endDate,
        totalAppointments: kpis.metrics.totalAppointments,
        confirmationRate: kpis.metrics.confirmationRate,
        cancellationRate: kpis.metrics.cancellationRate,
        totalSMSSent: kpis.metrics.totalSMSSent,
        timestamp: kpis.timestamp,
      });
      stringifier.end();
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('Analytics KPI Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).font('Helvetica').text(`Periode: ${kpis.period.startDate} -> ${kpis.period.endDate}`);
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Total appointments: ${kpis.metrics.totalAppointments}`);
    doc.font('Helvetica-Bold').text(`Confirmation rate: ${kpis.metrics.confirmationRate}%`);
    doc.font('Helvetica-Bold').text(`Cancellation rate: ${kpis.metrics.cancellationRate}%`);
    doc.font('Helvetica-Bold').text(`Total SMS sent: ${kpis.metrics.totalSMSSent}`);
    doc.moveDown();
    doc.font('Helvetica').text(`Generated at: ${kpis.timestamp}`);
    doc.end();
  }
}
