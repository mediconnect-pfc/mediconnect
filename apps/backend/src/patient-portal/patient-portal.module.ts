import { Module } from '@nestjs/common';
import { PatientPortalController } from './patient-portal.controller';
import { PatientPortalService } from './patient-portal.service';
import { AppointmentsEventsModule } from '../appointments/appointments-events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AppointmentsEventsModule,
    NotificationsModule,
  ],
  controllers: [PatientPortalController],
  providers: [PatientPortalService],
  exports: [PatientPortalService],
})
export class PatientPortalModule {}
