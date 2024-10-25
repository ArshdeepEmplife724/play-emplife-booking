import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class RescheduleBookingDto {
  @IsString()
  @IsNotEmpty()
  projectManagerId: string;

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
