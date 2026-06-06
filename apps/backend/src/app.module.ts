import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { PatientPortalModule } from './patient-portal/patient-portal.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EstablishmentsModule,
    PatientPortalModule,
    AppointmentsModule,
  ],
})
export class AppModule {}
