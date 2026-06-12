import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
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
}
