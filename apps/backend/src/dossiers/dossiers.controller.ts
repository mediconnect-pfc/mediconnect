import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { DossiersService } from './dossiers.service';
import { createDossierSchema } from './dto/create-dossier.dto';
import { updateDossierSchema } from './dto/update-dossier.dto';

@Controller('dossiers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
export class DossiersController {
  constructor(private readonly dossiersService: DossiersService) {}

  private getEstablishmentId(user: AuthenticatedUser): string | null {
    if (!user.establishmentId && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Utilisateur sans etablissement');
    }

    return user.establishmentId;
  }

  @Post()
  @Roles('DOCTOR')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    if (user.role !== 'DOCTOR') {
      throw new ForbiddenException('Acces reserve aux medecins');
    }

    const parsed = createDossierSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return this.dossiersService.create({
      establishmentId: this.getEstablishmentId(user),
      medecinId: user.id,
      patientId: parsed.data.patientId,
      notes: parsed.data.notes,
      ordonnance: parsed.data.ordonnance,
    });
  }

  @Get('patient/:patientId')
  findByPatient(@CurrentUser() user: AuthenticatedUser, @Param('patientId') patientId: string) {
    return this.dossiersService.findByPatient(this.getEstablishmentId(user), patientId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dossiersService.findOne(this.getEstablishmentId(user), id);
  }

  @Patch(':id')
  @Roles('DOCTOR')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    if (user.role !== 'DOCTOR') {
      throw new ForbiddenException('Acces reserve aux medecins');
    }

    const parsed = updateDossierSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return this.dossiersService.update({
      establishmentId: this.getEstablishmentId(user),
      dossierId: id,
      medecinId: user.id,
      notes: parsed.data.notes,
      ordonnance: parsed.data.ordonnance,
    });
  }

  @Delete(':id')
  @Roles('DOCTOR')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    if (user.role !== 'DOCTOR') {
      throw new ForbiddenException('Acces reserve aux medecins');
    }

    return this.dossiersService.remove({
      establishmentId: this.getEstablishmentId(user),
      dossierId: id,
      medecinId: user.id,
    });
  }
}
