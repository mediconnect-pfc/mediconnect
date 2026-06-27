import { Controller, Get, Patch, Param, Query, UnauthorizedException } from '@nestjs/common';
import { PatientPortalService } from './patient-portal.service';

@Controller('patient/portal')
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Get()
  getPortalData(@Query('t') shortToken?: string, @Query('token') token?: string) {
    const portalToken = shortToken || token;
    if (!portalToken) throw new UnauthorizedException('Token manquant');
    return this.patientPortalService.getPortalData(portalToken);
  }

  @Patch('rdv/:id/confirm')
  confirmAppointment(
    @Param('id') id: string,
    @Query('t') shortToken?: string,
    @Query('token') token?: string,
  ) {
    const portalToken = shortToken || token;
    if (!portalToken) throw new UnauthorizedException('Token manquant');
    return this.patientPortalService.confirmAppointment(id, portalToken);
  }

  @Patch('rdv/:id/cancel')
  cancelAppointment(
    @Param('id') id: string,
    @Query('t') shortToken?: string,
    @Query('token') token?: string,
  ) {
    const portalToken = shortToken || token;
    if (!portalToken) throw new UnauthorizedException('Token manquant');
    return this.patientPortalService.cancelAppointment(id, portalToken);
  }
}
