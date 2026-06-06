import { IsOptional, IsString, IsDateString } from 'class-validator';

export class FilterAppointmentDto {
  @IsOptional()
  @IsString()
  doctorName?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  establishmentId?: string;
}
