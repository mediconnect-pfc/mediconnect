import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { kpiQuerySchema } from './dto/kpi-query.dto';
import { exportQuerySchema } from './dto/export-query.dto';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('kpis')
  async getKpis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsed = kpiQuerySchema.safeParse({ startDate, endDate });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.computeKpis(parsed.data.startDate, parsed.data.endDate);
  }

  @Post('export/pdf')
  async exportPdf(
    @Req() req: Request,
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

    const kpis = await this.service.computeKpis(parsed.data.startDate, parsed.data.endDate);
    const { metrics, period } = kpis;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-${period.startDate}-${period.endDate}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text(title || "Rapport d'analyse", { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Période : ${period.startDate} → ${period.endDate}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.moveTo(40, doc.y).lineTo(552, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(1);

    const labels: [string, string][] = [
      ['Total rendez-vous', `${metrics.totalAppointments}`],
      ['Taux de confirmation', `${metrics.confirmationRate}%`],
      ["Taux d'annulation", `${metrics.cancellationRate}%`],
      ['SMS envoyés', `${metrics.totalSMSSent}`],
    ];

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e40af').text('Indicateurs clés');
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
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, doc.page.height - 40, { align: 'center' });
    doc.end();
  }

  @Post('export/csv')
  async exportCsv(
    @Req() req: Request,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    const parsed = exportQuerySchema.safeParse({ startDate, endDate, type });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const kpis = await this.service.computeKpis(parsed.data.startDate, parsed.data.endDate);
    const { metrics, period } = kpis;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-${period.startDate}-${period.endDate}.csv"`);

    const stringifier = stringify({ header: true, columns: ['Indicateur', 'Valeur'], delimiter: ';' });
    stringifier.pipe(res);

    const rows: [string, string][] = [
      ['Période début', period.startDate],
      ['Période fin', period.endDate],
      ['Total rendez-vous', String(metrics.totalAppointments)],
      ['Taux de confirmation', `${metrics.confirmationRate}%`],
      ["Taux d'annulation", `${metrics.cancellationRate}%`],
      ['SMS envoyés', String(metrics.totalSMSSent)],
    ];

    rows.forEach(([indicator, value]) => stringifier.write([indicator, value]));
    stringifier.end();
  }
}
