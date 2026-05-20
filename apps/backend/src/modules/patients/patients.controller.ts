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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { createPatientSchema } from './dto/create-patient.dto';
import { updatePatientSchema } from './dto/update-patient.dto';
import type { Request } from 'express';
import * as csv from 'csv-parse/sync';

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
  ) {
    const safeLimit = Math.min(limit, 50);
    return this.service.findAll(this.getEstId(req), page, safeLimit);
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

    let records: any[];
    try {
      records = csv.parse(file.buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: [',', ';'],
      });
    } catch {
      throw new BadRequestException('Fichier CSV invalide');
    }

    return this.service.import(this.getEstId(req), records);
  }

  @Get(':id/portal-token')
  generatePortalToken(@Req() req: Request, @Param('id') id: string) {
    return this.service.generatePortalToken(id, this.getEstId(req));
  }
}
