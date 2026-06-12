import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
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
}
