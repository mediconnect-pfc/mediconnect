import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async login(dto: LoginDto) {
        // 1. Chercher d'abord dans SuperAdmin
        const superAdmin = await this.prisma.superAdmin.findUnique({
            where: { email: dto.email },
        });

        if (superAdmin) {
            const isPasswordValid = await bcrypt.compare(dto.password, superAdmin.password);
            if (!isPasswordValid) {
                throw new UnauthorizedException('Email ou mot de passe incorrect');
            }

            const tokens = await this.generateTokens(
                superAdmin.id,
                superAdmin.email,
                'SUPER_ADMIN',
                null,
            );

            return {
                user: {
                    id: superAdmin.id,
                    name: superAdmin.name,
                    email: superAdmin.email,
                    role: 'SUPER_ADMIN',
                    establishmentId: null,
                },
                ...tokens,
            };
        }

        // 2. Chercher dans User
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: {
                establishment: {
                    select: { id: true, name: true, type: true }
                }
            }
        });

        if (!user) {
            throw new UnauthorizedException('Email ou mot de passe incorrect');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Email ou mot de passe incorrect');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Compte désactivé');
        }

        const tokens = await this.generateTokens(
            user.id,
            user.email,
            user.role,
            user.establishmentId,
        );

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                specialty: user.specialty,
                establishment: user.establishment,
            },
            ...tokens,
        };
    }

    async refreshToken(userId: string, role: string) {
        if (role === 'SUPER_ADMIN') {
            const superAdmin = await this.prisma.superAdmin.findUnique({
                where: { id: userId },
            });
            if (!superAdmin) throw new UnauthorizedException();
            return this.generateTokens(superAdmin.id, superAdmin.email, 'SUPER_ADMIN', null);
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) throw new UnauthorizedException();
        return this.generateTokens(user.id, user.email, user.role, user.establishmentId);
    }

    async generateTokens(
        userId: string,
        email: string,
        role: string,
        establishmentId: string | null,
    ) {
        const payload = { sub: userId, email, role, establishmentId };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: '15m',
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET ?? 'fallback_refresh_secret',
            expiresIn: '7d',
        });

        return { accessToken, refreshToken };
    }
}