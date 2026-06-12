import {
  Controller, Get, Post, Patch, Param,
  Body, Query, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { FilterAppointmentDto } from './dto/filter-appointment.dto';

@Controller('appointments')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // GET /appointments → liste RDV du jour avec filtres
  @Get()
  findToday(@Query() filters: FilterAppointmentDto) {
    return this.appointmentsService.findTodayAppointments(filters);
  }

  // POST /appointments → nouveau RDV
  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  // PATCH /appointments/:id/confirm → confirmer
  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.appointmentsService.confirm(id);
  }

  // PATCH /appointments/:id/cancel → annuler
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }
}
