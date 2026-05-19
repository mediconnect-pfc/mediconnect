import { IsEmail, IsString, IsEnum, MinLength, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  establishmentId: string;

  @IsOptional()
  @IsString()
  specialty?: string;
}