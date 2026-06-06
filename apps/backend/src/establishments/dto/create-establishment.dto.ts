import { IsString, IsEnum, IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { EstablishmentType, Plan } from '../../../generated/prisma';

export class CreateEstablishmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(EstablishmentType)
  type: EstablishmentType;

  @IsEnum(Plan)
  plan: Plan;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}
