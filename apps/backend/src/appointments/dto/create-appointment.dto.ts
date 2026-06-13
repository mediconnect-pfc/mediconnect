import { IsString, IsNotEmpty, IsDateString, IsOptional, IsIn } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  time: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsIn(['manual', 'ai', 'portal'])
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
