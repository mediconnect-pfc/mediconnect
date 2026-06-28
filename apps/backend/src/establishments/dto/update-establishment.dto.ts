import { IsString, IsEnum, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { EstabType, PlanType } from '@prisma/client';

export class UpdateEstablishmentDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEnum(EstabType)
  @IsOptional()
  type?: EstabType;

  @IsEnum(PlanType)
  @IsOptional()
  plan?: PlanType;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}
