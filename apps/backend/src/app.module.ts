import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { UsersModule } from './modules/users/users.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { PatientPortalModule } from './patient-portal/patient-portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    PatientsModule,
    UsersModule,
    EstablishmentsModule,
    PatientPortalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
