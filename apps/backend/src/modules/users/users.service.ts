import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

const USER_SELECT = {
  id: true,
  establishmentId: true,
  name: true,
  email: true,
  role: true,
  specialty: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(establishmentId: string) {
    return this.prisma.user.findMany({
      where: { establishmentId },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, establishmentId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, establishmentId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    specialty?: string | null;
    establishmentId: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const hashed = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        role: data.role as UserRole,
        specialty: data.specialty ?? undefined,
        establishmentId: data.establishmentId,
      },
      select: USER_SELECT,
    });
  }

  async update(
    id: string,
    establishmentId: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      specialty?: string | null;
      isActive?: boolean;
    },
  ) {
    const user = await this.prisma.user.findFirst({ where: { id, establishmentId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (data.email && data.email !== user.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (conflict) throw new ConflictException('Cet email est déjà utilisé');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password !== undefined) updateData.password = await bcrypt.hash(data.password, 10);
    if (data.role !== undefined) updateData.role = data.role;
    if (data.specialty !== undefined) updateData.specialty = data.specialty ?? null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });
  }

  async deactivate(id: string, establishmentId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, establishmentId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SELECT,
    });
  }
}
