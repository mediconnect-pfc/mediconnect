import { Controller, Get, Patch, Param, Query, UnauthorizedException } from '@nestjs/common';
import { PatientPortalService } from './patient-portal.service';

@Controller('patient/portal')
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  // GET /patient/portal?token=xxx → données du patient
  @Get()
  getPortalData(@Query('token') token: string) {
    if (!token) throw new UnauthorizedException('Token manquant');
    return this.patientPortalService.getPortalData(token);
  }

  // PATCH /patient/portal/rdv/:id/confirm → confirmer RDV
  @Patch('rdv/:id/confirm')
  confirmAppointment(
    @Param('id') id: string,
    @Query('token') token: string,
  ) {
    if (!token) throw new UnauthorizedException('Token manquant');
    return this.patientPortalService.confirmAppointment(id, token);
  }

  // PATCH /patient/portal/rdv/:id/cancel → annuler RDV
  @Patch('rdv/:id/cancel')
  cancelAppointment(
    @Param('id') id: string,
    @Query('token') token: string,
  ) {
    if (!token) throw new UnauthorizedException('Token manquant');
    return this.patientPortalService.cancelAppointment(id, token);
  }
}
