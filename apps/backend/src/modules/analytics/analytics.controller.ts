import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { kpiQuerySchema } from './dto/kpi-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('kpis')
  async getKpis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsed = kpiQuerySchema.safeParse({ startDate, endDate });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.computeKpis(parsed.data.startDate, parsed.data.endDate);
  }
}
