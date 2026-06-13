import { IsOptional, IsString, IsDateString } from 'class-validator';

export class FilterAppointmentDto {
  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
