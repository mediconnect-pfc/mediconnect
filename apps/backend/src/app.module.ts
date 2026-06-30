import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { UsersModule } from './modules/users/users.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { PatientPortalModule } from './patient-portal/patient-portal.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InteractionsModule } from './interactions/interactions.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DossiersModule } from './dossiers/dossiers.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: config.get<string>('REDIS_URL')
          ? {
              url: config.get<string>('REDIS_URL'),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            }
          : {
              host: config.get<string>('REDIS_HOST', '127.0.0.1'),
              port: parseInt(config.get<string>('REDIS_PORT', '6379'), 10),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            },
      }),
    }),
    PrismaModule,
    AuthModule,
    PatientsModule,
    UsersModule,
    EstablishmentsModule,
    PatientPortalModule,
    AppointmentsModule,
    NotificationsModule,
    InteractionsModule,
    CampaignsModule,
    DossiersModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
