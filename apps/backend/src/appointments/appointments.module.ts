import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PatientPortalModule } from '../patient-portal/patient-portal.module';
import { AppointmentsEventsModule } from './appointments-events.module';

@Module({
  imports: [PatientPortalModule, AppointmentsEventsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
