import { IsString, IsEmail, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  projectManagerId: string;

  @IsString()
  @IsNotEmpty()
  projectManagerName: string;

  @IsEmail()
  @IsNotEmpty()
  studentEmail: string;

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
