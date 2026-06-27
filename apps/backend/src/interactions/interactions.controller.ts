import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InteractionType } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { InteractionsService } from './interactions.service';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Get(':patientId/interactions')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST')
  findByPatient(
    @Param('patientId') patientId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
  ) {
    if (type && !Object.values(InteractionType).includes(type as InteractionType)) {
      throw new BadRequestException('Parametre type invalide');
    }

    if (user.role !== 'SUPER_ADMIN' && !user.establishmentId) {
      throw new ForbiddenException('Utilisateur sans etablissement');
    }

    return this.interactionsService.findByPatient(
      patientId,
      user.establishmentId,
      page ?? 1,
      limit ?? 20,
      type as InteractionType | undefined,
    );
  }
}
