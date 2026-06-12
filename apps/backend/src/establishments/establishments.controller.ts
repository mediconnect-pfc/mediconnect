import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { EstablishmentsService } from './establishments.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

interface AuthUser {
  id: string;
  role: string;
}

@Controller('establishments')
@UseGuards(JwtAuthGuard)
export class EstablishmentsController {
  constructor(private readonly service: EstablishmentsService) {}

  private requireSuperAdmin(req: Request): void {
    const user = (req as any).user as AuthUser;
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé aux super administrateurs');
    }
  }

  @Get()
  findAll(@Req() req: Request) {
    this.requireSuperAdmin(req);
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() dto: CreateEstablishmentDto) {
    this.requireSuperAdmin(req);
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateEstablishmentDto) {
    this.requireSuperAdmin(req);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deactivate(@Req() req: Request, @Param('id') id: string) {
    this.requireSuperAdmin(req);
    return this.service.deactivate(id);
  }
}
