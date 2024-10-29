import { IsString, IsNotEmpty } from 'class-validator';

export class CancelBookingDto {
  @IsString()
  @IsNotEmpty()
  projectManagerId: string;

  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  teamName: string;

  @IsString()
  @IsNotEmpty()
  teamId: string;
}
