import { IsString, IsEmail, MinLength, IsOptional, IsEnum } from 'class-validator';
import { EstabType, UserRole } from '@prisma/client';

export class RegisterDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  establishmentName?: string;

  @IsOptional()
  @IsEnum(EstabType)
  establishmentType?: EstabType;

  @IsOptional()
  @IsString()
  establishmentPhone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
