import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET ?? 'fallback_secret',
        });
    }

    async validate(payload: {
        sub: string;
        email: string;
        role: string;
        establishmentId: string | null;
    }) {
        // SuperAdmin
        if (payload.role === 'SUPER_ADMIN') {
            const superAdmin = await this.prisma.superAdmin.findUnique({
                where: { id: payload.sub },
            });
            if (!superAdmin) throw new UnauthorizedException();
            return {
                id: superAdmin.id,
                email: superAdmin.email,
                role: 'SUPER_ADMIN',
                establishmentId: null,
                name: superAdmin.name,
            };
        }

        // User normal
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException();
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            establishmentId: user.establishmentId,
            name: user.name,
        };
    }
}