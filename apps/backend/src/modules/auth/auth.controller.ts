import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  refresh(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.refreshToken(user.id, user.role);
  }

  // Route test — SUPER_ADMIN seulement
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  adminOnly(@CurrentUser() user: AuthenticatedUser) {
    return { message: `Bienvenue ${user.name} — accès Super Admin !` };
  }

  // Route test — ADMIN et SUPER_ADMIN
  @Get('staff-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  staffOnly(@CurrentUser() user: AuthenticatedUser) {
    return { message: `Bienvenue ${user.name} — accès Staff !` };
  }

  // Route test — rôles cliniques (DOCTOR, RECEPTIONIST, CAISSIER)
  @Get('clinical-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR', 'RECEPTIONIST', 'CAISSIER')
  clinicalOnly(@CurrentUser() user: AuthenticatedUser) {
    return { message: `Bienvenue ${user.name} — accès clinique !` };
  }
}