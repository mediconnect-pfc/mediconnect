import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppointmentsGateway } from './appointments.gateway';
import { AppointmentsAuditService } from './appointments-audit.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [AppointmentsGateway, AppointmentsAuditService],
  exports: [AppointmentsGateway, AppointmentsAuditService],
})
export class AppointmentsEventsModule {}
