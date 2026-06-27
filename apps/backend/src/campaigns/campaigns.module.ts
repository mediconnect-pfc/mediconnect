import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { CAMPAIGN_QUEUE } from './campaign.constants';
import { CampaignProcessor } from './campaign.processor';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    BullModule.registerQueue({ name: CAMPAIGN_QUEUE }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignProcessor, RolesGuard],
})
export class CampaignsModule {}
