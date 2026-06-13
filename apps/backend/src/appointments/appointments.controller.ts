import {
  Controller, Get, Post, Patch, Param,
  Body, Query, UsePipes, ValidationPipe,
  UseGuards, Req, BadRequestException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { FilterAppointmentDto } from './dto/filter-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

interface AuthUser {
  id: string;
  establishmentId?: string;
  role: string;
}

@Controller('appointments')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  private getEstId(req: Request): string {
    const user = (req as any).user as AuthUser;
    if (!user.establishmentId) throw new BadRequestException('Utilisateur sans établissement');
    return user.establishmentId;
  }

  @Get('options')
  getOptions(@Req() req: Request) {
    return this.appointmentsService.getOptions(this.getEstId(req));
  }

  // GET /appointments → liste RDV du jour avec filtres
  @Get()
  findToday(@Req() req: Request, @Query() filters: FilterAppointmentDto) {
    return this.appointmentsService.findTodayAppointments(this.getEstId(req), filters);
  }

  // POST /appointments → nouveau RDV
  @Post()
  create(@Req() req: Request, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(this.getEstId(req), dto);
  }

  // PATCH /appointments/:id/confirm → confirmer
  @Patch(':id/confirm')
  confirm(@Req() req: Request, @Param('id') id: string) {
    return this.appointmentsService.confirm(this.getEstId(req), id);
  }

  // PATCH /appointments/:id/cancel → annuler
  @Patch(':id/cancel')
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.appointmentsService.cancel(this.getEstId(req), id);
  }
}
