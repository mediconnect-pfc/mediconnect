import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { createPatientSchema } from './dto/create-patient.dto';
import { updatePatientSchema } from './dto/update-patient.dto';
import type { Request } from 'express';
import * as csv from 'csv-parse/sync';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify';

interface AuthUser {
  id: string;
  establishmentId?: string;
  role: string;
}

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  private getEstId(req: Request): string {
    const user = (req as any).user as AuthUser;
    if (!user.establishmentId) throw new BadRequestException('Utilisateur sans établissement');
    return user.establishmentId;
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const safeLimit = Math.min(limit, 50);
    return this.service.findAll(this.getEstId(req), page, safeLimit, search, status);
  }

  @Get('search')
  search(
    @Req() req: Request,
    @Query('q') q: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (!q) throw new BadRequestException('Paramètre q requis');
    return this.service.search(this.getEstId(req), q, page, Math.min(limit, 50));
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.service.findOne(id, this.getEstId(req));
  }

  @Post()
  create(@Req() req: Request, @Body() body: any) {
    const parsed = createPatientSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.create({ ...parsed.data, establishmentId: this.getEstId(req) });
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const parsed = updatePatientSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.update(id, this.getEstId(req), parsed.data);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.remove(id, this.getEstId(req));
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@Req() req: Request, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Fichier CSV requis');
    if (!file.originalname.endsWith('.csv')) throw new BadRequestException('Le fichier doit être au format CSV');

    const raw = file.buffer.toString('utf-8');

    let rows: string[][];
    try {
      rows = csv.parse(raw, {
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        delimiter: [',', ';'],
      }) as string[][];
    } catch {
      throw new BadRequestException('Fichier CSV invalide');
    }

    if (rows.length === 0) throw new BadRequestException('Fichier vide');

    const knownHeaders = ['firstName', 'lastName', 'firstname', 'lastname', 'prénom', 'nom', 'phone', 'téléphone', 'email', 'birthdate', 'date', 'tags', 'status'];
    const first = rows[0];
    const hasHeaders = first.some((h) => knownHeaders.includes(h.toLowerCase().trim()));

    const records = hasHeaders
      ? rows.slice(1).map((row) => {
          const obj: any = {};
          const headerRow = first.map((h) => h.toLowerCase().trim());
          row.forEach((val, i) => {
            const h = headerRow[i] || `col${i}`;
            if (h.includes('first') || h === 'prénom') obj.firstName = val;
            else if (h.includes('last') || h === 'nom') obj.lastName = val;
            else if (h === 'phone' || h === 'téléphone') obj.phone = val;
            else if (h === 'email') obj.email = val;
            else if (h === 'birthdate' || h === 'date') obj.birthDate = val;
            else if (h === 'tags') obj.tags = val;
            else if (h === 'status') obj.status = val?.toUpperCase();
          });
          return obj;
        })
      : rows.map((row) => ({
          firstName: row[0] || '',
          lastName: row[1] || '',
          phone: row[2] || '',
          birthDate: row[3] || null,
          tags: row[4] || '',
          status: ((row[5] || '').toUpperCase() as 'ACTIF' | 'PENDING' | 'NO_SHOW') || 'ACTIF',
        }));

    return this.service.import(this.getEstId(req), records);
  }

  @Get(':id/portal-token')
  generatePortalToken(@Req() req: Request, @Param('id') id: string) {
    return this.service.generatePortalToken(id, this.getEstId(req));
  }

  @Get('export/pdf')
  async exportPdf(
    @Req() req: Request,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!startDate || !endDate) throw new BadRequestException('startDate et endDate requis (YYYY-MM-DD)');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new BadRequestException('Format startDate invalide');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new BadRequestException('Format endDate invalide');

    const estabId = this.getEstId(req);
    const patients = await this.service.findAll(estabId, 1, 1000);
    const list = patients.data;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="patients-${startDate}-${endDate}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('Export Patients', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Période: ${startDate} → ${endDate}`, { align: 'center' });
    doc.moveDown();

    const headers = ['Nom', 'Téléphone', 'Email', 'Statut'];
    const colX = [40, 180, 300, 430];

    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: 130 }));
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(552, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9);
    for (const p of list) {
      const yStart = doc.y;
      const row = [`${p.firstName} ${p.lastName}`, p.phone, p.email || '—', p.status || '—'];
      row.forEach((val, i) => doc.text(val, colX[i], yStart, { width: 130 }));
      doc.moveDown(0.8);
      if (doc.y > 720) doc.addPage();
    }

    doc.fontSize(8).fillColor('#999');
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, doc.page.height - 40, { align: 'center' });
    doc.end();
  }

  @Get('export/csv')
  async exportCsv(
    @Req() req: Request,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!startDate || !endDate) throw new BadRequestException('startDate et endDate requis (YYYY-MM-DD)');

    const estabId = this.getEstId(req);
    const patients = await this.service.findAll(estabId, 1, 1000);
    const list = patients.data;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="patients-${startDate}-${endDate}.csv"`);

    const stringifier = stringify({ header: true, columns: ['firstName', 'lastName', 'phone', 'email', 'birthDate', 'status', 'tags'], delimiter: ';' });
    stringifier.pipe(res);

    for (const p of list) {
      stringifier.write([p.firstName, p.lastName, p.phone, p.email || '', p.birthDate || '', p.status || '', (p.tags || []).join(', ')]);
    }
    stringifier.end();
  }
}
