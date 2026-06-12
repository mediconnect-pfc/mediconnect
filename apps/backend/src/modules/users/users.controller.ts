import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { createUserSchema } from './dto/create-user.dto';
import { updateUserSchema } from './dto/update-user.dto';
import type { Request } from 'express';

interface AuthUser {
  id: string;
  establishmentId?: string;
  role: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  private getEstId(req: Request): string {
    const user = (req as any).user as AuthUser;
    if (!user.establishmentId) throw new BadRequestException('Utilisateur sans établissement');
    return user.establishmentId;
  }

  private requireAdmin(req: Request): void {
    const user = (req as any).user as AuthUser;
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }
  }

  @Get()
  findAll(@Req() req: Request) {
    this.requireAdmin(req);
    return this.service.findAll(this.getEstId(req));
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.service.findOne(id, this.getEstId(req));
  }

  @Post()
  create(@Req() req: Request, @Body() body: any) {
    this.requireAdmin(req);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten().fieldErrors);
    return this.service.create({ ...parsed.data, establishmentId: this.getEstId(req) });
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    this.requireAdmin(req);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten().fieldErrors);
    return this.service.update(id, this.getEstId(req), parsed.data);
  }

  @Delete(':id')
  deactivate(@Req() req: Request, @Param('id') id: string) {
    this.requireAdmin(req);
    return this.service.deactivate(id, this.getEstId(req));
  }
}
