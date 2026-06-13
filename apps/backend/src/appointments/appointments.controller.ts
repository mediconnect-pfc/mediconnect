import {
  Controller, Get, Post, Patch, Delete, Param,
  Body, Query, UsePipes, ValidationPipe,
  UseGuards, Req, BadRequestException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
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

  private getUserId(req: Request): string {
    return ((req as any).user as AuthUser).id;
  }

  @Get('options')
  getOptions(@Req() req: Request) {
    return this.appointmentsService.getOptions(this.getEstId(req));
  }

  @Get('today')
  findToday(@Req() req: Request, @Query('doctorId') doctorId?: string) {
    return this.appointmentsService.findToday(this.getEstId(req), doctorId);
  }

  @Get('doctor/:doctorId')
  findByDoctor(
    @Req() req: Request,
    @Param('doctorId') doctorId: string,
    @Query() filters: FilterAppointmentDto,
  ) {
    return this.appointmentsService.findByDoctor(this.getEstId(req), doctorId, filters);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.appointmentsService.findOne(this.getEstId(req), id);
  }

  @Get()
  findAll(@Req() req: Request, @Query() filters: FilterAppointmentDto) {
    return this.appointmentsService.findAll(this.getEstId(req), filters);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(this.getEstId(req), dto, this.getUserId(req));
  }

  @Patch(':id/confirm')
  confirm(@Req() req: Request, @Param('id') id: string) {
    return this.appointmentsService.confirm(this.getEstId(req), id, this.getUserId(req));
  }

  @Patch(':id/cancel')
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.appointmentsService.cancel(this.getEstId(req), id, this.getUserId(req));
  }

  @Patch(':id/no-show')
  markNoShow(@Req() req: Request, @Param('id') id: string) {
    return this.appointmentsService.markNoShow(this.getEstId(req), id, this.getUserId(req));
  }

  @Patch(':id/complete')
  complete(@Req() req: Request, @Param('id') id: string) {
    return this.appointmentsService.complete(this.getEstId(req), id, this.getUserId(req));
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(this.getEstId(req), id, dto, this.getUserId(req));
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.appointmentsService.remove(this.getEstId(req), id, this.getUserId(req));
  }
}
