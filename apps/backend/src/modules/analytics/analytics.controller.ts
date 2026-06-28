import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Post,
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
import { exportQuerySchema } from './dto/export-query.dto';

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

  @Get('appointments/week')
  async getAppointmentsWeek(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsed = kpiQuerySchema.safeParse({ startDate, endDate });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return this.service.computeAppointmentsSeries(
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (format !== 'csv' && format !== 'pdf') {
      throw new BadRequestException('format doit etre csv ou pdf');
    }

    const parsed = kpiQuerySchema.safeParse({
      startDate: startDate ?? dateFrom,
      endDate: endDate ?? dateTo,
    });
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
        columns: [
          'periodStart',
          'periodEnd',
          'totalAppointments',
          'confirmationRate',
          'cancellationRate',
          'noShowRate',
          'totalSMSSent',
          'totalCallsMade',
          'totalPatients',
          'timestamp',
        ],
      });

      stringifier.pipe(res);
      stringifier.write({
        periodStart: kpis.period.startDate,
        periodEnd: kpis.period.endDate,
        totalAppointments: kpis.metrics.totalAppointments,
        confirmationRate: kpis.metrics.confirmationRate,
        cancellationRate: kpis.metrics.cancellationRate,
        noShowRate: kpis.metrics.noShowRate,
        totalSMSSent: kpis.metrics.totalSMSSent,
        totalCallsMade: kpis.metrics.totalCallsMade,
        totalPatients: kpis.metrics.totalPatients,
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
    doc.font('Helvetica-Bold').text(`No-show rate: ${kpis.metrics.noShowRate}%`);
    doc.font('Helvetica-Bold').text(`Total SMS sent: ${kpis.metrics.totalSMSSent}`);
    doc.font('Helvetica-Bold').text(`Total calls made: ${kpis.metrics.totalCallsMade}`);
    doc.font('Helvetica-Bold').text(`Total patients: ${kpis.metrics.totalPatients}`);
    doc.moveDown();
    doc.font('Helvetica').text(`Generated at: ${kpis.timestamp}`);
    doc.end();
  }

  @Post('export/pdf')
  async exportPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('title') title?: string,
  ) {
    const parsed = exportQuerySchema.safeParse({ startDate, endDate, type, title });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const kpis = await this.service.computeKpis(
      parsed.data.startDate,
      parsed.data.endDate,
      this.getEstablishmentId(user),
    );
    const { metrics, period } = kpis;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-${period.startDate}-${period.endDate}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text(title || "Rapport d'analyse", { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Periode : ${period.startDate} -> ${period.endDate}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.moveTo(40, doc.y).lineTo(552, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(1);

    const labels: [string, string][] = [
      ['Total rendez-vous', `${metrics.totalAppointments}`],
      ['Taux de confirmation', `${metrics.confirmationRate}%`],
      ["Taux d'annulation", `${metrics.cancellationRate}%`],
      ['SMS envoyes', `${metrics.totalSMSSent}`],
    ];

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e40af').text('Indicateurs cles');
    doc.moveDown(0.5);

    labels.forEach(([label, value]) => {
      doc.fontSize(11).font('Helvetica').fillColor('#374151');
      const labelX = 50;
      const valueX = 350;
      doc.text(label, labelX, doc.y, { continued: false });
      doc.font('Helvetica-Bold').text(value, valueX, doc.y - doc.currentLineHeight(), { continued: false });
      doc.moveDown(0.5);
    });

    doc.fontSize(8).font('Helvetica').fillColor('#9ca3af');
    doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, 40, doc.page.height - 40, { align: 'center' });
    doc.end();
  }

  @Post('export/csv')
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    const parsed = exportQuerySchema.safeParse({ startDate, endDate, type });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const kpis = await this.service.computeKpis(
      parsed.data.startDate,
      parsed.data.endDate,
      this.getEstablishmentId(user),
    );
    const { metrics, period } = kpis;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-${period.startDate}-${period.endDate}.csv"`);

    const stringifier = stringify({ header: true, columns: ['Indicateur', 'Valeur'], delimiter: ';' });
    stringifier.pipe(res);

    const rows: [string, string][] = [
      ['Periode debut', period.startDate],
      ['Periode fin', period.endDate],
      ['Total rendez-vous', String(metrics.totalAppointments)],
      ['Taux de confirmation', `${metrics.confirmationRate}%`],
      ["Taux d'annulation", `${metrics.cancellationRate}%`],
      ['SMS envoyes', String(metrics.totalSMSSent)],
    ];

    rows.forEach(([indicator, value]) => stringifier.write([indicator, value]));
    stringifier.end();
  }
}
