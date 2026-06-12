import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';

@Injectable()
export class EstablishmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.establishment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const establishment = await this.prisma.establishment.findUnique({
      where: { id },
    });
    if (!establishment) throw new NotFoundException(`Établissement #${id} introuvable`);
    return establishment;
  }

  create(dto: CreateEstablishmentDto) {
    return this.prisma.establishment.create({ data: dto });
  }

  async update(id: string, dto: UpdateEstablishmentDto) {
    await this.findOne(id);
    return this.prisma.establishment.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.establishment.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
