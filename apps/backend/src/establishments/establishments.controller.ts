import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { EstablishmentsService } from './establishments.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

interface AuthUser {
  id: string;
  role: string;
  establishmentId?: string | null;
}

@Controller('establishments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstablishmentsController {
  constructor(private readonly service: EstablishmentsService) {}

  private requireAdminOrSuperAdmin(user: AuthUser): void {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('AccÃ¨s rÃ©servÃ© aux administrateurs');
    }
  }

  private requireOwnerOrSuperAdmin(user: AuthUser, establishmentId: string): void {
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    this.requireAdminOrSuperAdmin(user);

    if (!user.establishmentId || user.establishmentId !== establishmentId) {
      throw new ForbiddenException('AccÃ¨s refusÃ©');
    }
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll(@CurrentUser() user: AuthUser) {
    this.requireAdminOrSuperAdmin(user);
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    this.requireOwnerOrSuperAdmin(user, id);
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEstablishmentDto) {
    this.requireAdminOrSuperAdmin(user);
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateEstablishmentDto) {
    this.requireOwnerOrSuperAdmin(user, id);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    this.requireAdminOrSuperAdmin(user);
    return this.service.deactivate(id);
  }
}
