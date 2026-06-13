import { Module } from '@nestjs/common';
import { AppointmentsGateway } from './appointments.gateway';
import { AppointmentsAuditService } from './appointments-audit.service';

@Module({
  providers: [AppointmentsGateway, AppointmentsAuditService],
  exports: [AppointmentsGateway, AppointmentsAuditService],
})
export class AppointmentsEventsModule {}
