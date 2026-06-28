import { IsString, IsEnum, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { EstabType, PlanType } from '@prisma/client';

export class CreateEstablishmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(EstabType)
  type: EstabType;

  @IsEnum(PlanType)
  plan: PlanType;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}
