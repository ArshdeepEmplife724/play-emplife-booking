import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsISO8601,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateBookingWindowDto {
  @IsString()
  @IsNotEmpty()
  @IsISO8601()
  windowStartDate: string;

  @IsString()
  @IsNotEmpty()
  @IsISO8601()
  windowEndDate: string;

  @IsNotEmpty()
  @IsNumber()
  slotDuration: number;

  @IsNotEmpty()
  @IsNumber()
  breakDuration: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  numberOfStudents: number;

  @IsNotEmpty()
  @IsString()
  projectManagerId: string;

  @IsNotEmpty()
  @IsString()
  teamName: string;

  @IsNotEmpty()
  @IsString()
  teamId: string;

  @IsOptional()
  @IsBoolean()
  previewSlots?: boolean;
}
