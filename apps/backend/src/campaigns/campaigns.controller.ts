import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CampaignStatus, CampaignType } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { createCampaignSchema } from './dto/create-campaign.dto';
import { launchCampaignSchema } from './dto/launch-campaign.dto';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  private getEstablishmentId(user: AuthenticatedUser): string {
    if (!user.establishmentId) {
      throw new ForbiddenException('Utilisateur sans etablissement');
    }

    return user.establishmentId;
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const establishmentId = this.getEstablishmentId(user);

    return this.campaignsService.create(establishmentId, {
      name: parsed.data.name,
      type: parsed.data.type as CampaignType,
      message: parsed.data.message,
      segment: parsed.data.segment,
      scheduledAt: parsed.data.scheduledAt,
    });
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.campaignsService.findAll(this.getEstablishmentId(user));
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.findOneWithStats(this.getEstablishmentId(user), id);
  }

  @Post(':id/launch')
  launch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = launchCampaignSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return this.campaignsService.launch(this.getEstablishmentId(user), id);
  }

  @Patch(':id/pause')
  pause(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaignsService.pause(this.getEstablishmentId(user), id);
  }
}
