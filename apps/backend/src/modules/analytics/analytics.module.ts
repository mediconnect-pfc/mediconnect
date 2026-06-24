import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsGateway } from './analytics.gateway';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsGateway],
})
export class AnalyticsModule {}
