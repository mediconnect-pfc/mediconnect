import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PatientPortalModule } from '../patient-portal/patient-portal.module';
import { AppointmentsGateway } from './appointments.gateway';

@Module({
  imports: [PatientPortalModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsGateway],
})
export class AppointmentsModule {}
