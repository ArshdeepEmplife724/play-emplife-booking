import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  teamId: string;

  @IsString()
  @IsNotEmpty()
  projectManagerId: string;

  @IsString()
  @IsNotEmpty()
  projectManagerName: string;

  @IsString()
  @IsNotEmpty()
  studentEmail: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  studentName: string;

  @IsDateString()
  @IsNotEmpty()
  startDateTime: string;

  @IsDateString()
  @IsNotEmpty()
  endDateTime: string;

  @IsString()
  @IsNotEmpty()
  eventId: string;
}
