import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from './mail.service';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const hashed = await bcrypt.hash(dto.password, 10);

    const establishment = await this.prisma.establishment.create({
      data: {
        name: dto.establishmentName || 'Mon Établissement',
        type: dto.establishmentType || 'CLINIC',
        phone: dto.establishmentPhone || '',
      },
    });

    const user = await this.prisma.user.create({
      data: {
        establishmentId: establishment.id,
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: dto.role || 'DOCTOR',
      },
    });

    const token = this.jwt.sign({ sub: user.id, email: user.email, type: 'user' });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (user && (await bcrypt.compare(dto.password, user.password))) {
      const token = this.jwt.sign({ sub: user.id, email: user.email, type: 'user' });
      return {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      };
    }

    const admin = await this.prisma.superAdmin.findUnique({ where: { email: dto.email } });
    if (admin && (await bcrypt.compare(dto.password, admin.password))) {
      const token = this.jwt.sign({ sub: admin.id, email: admin.email, type: 'superadmin' });
      return {
        token,
        user: { id: admin.id, name: admin.name, email: admin.email, role: 'SUPER_ADMIN' },
      };
    }

    throw new UnauthorizedException('Email ou mot de passe incorrect');
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const admin = user ? null : await this.prisma.superAdmin.findUnique({ where: { email } });
    const accountType = user ? 'user' : admin ? 'superadmin' : null;

    if (accountType) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(token);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

      await this.prisma.passwordResetToken.updateMany({
        where: { email, accountType, usedAt: null },
        data: { usedAt: new Date() },
      });

      await this.prisma.passwordResetToken.create({
        data: { email, accountType, tokenHash, expiresAt },
      });

      const resetLink = `${this.frontendBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;

      try {
        await this.mail.sendPasswordReset(email, resetLink);
      } catch (error) {
        this.logger.error(
          `Failed to send password reset email to ${email}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    return {
      message:
        'Si un compte existe avec cette adresse, vous recevrez un lien pour réinitialiser votre mot de passe.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(dto.token) },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      if (resetToken.accountType === 'user') {
        await tx.user.update({
          where: { email: resetToken.email },
          data: { password: hashed },
        });
      } else if (resetToken.accountType === 'superadmin') {
        await tx.superAdmin.update({
          where: { email: resetToken.email },
          data: { password: hashed },
        });
      } else {
        throw new BadRequestException('Lien de réinitialisation invalide');
      }

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });
    });

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private frontendBaseUrl(): string {
    return (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001').replace(/\/$/, '');
  }
}
