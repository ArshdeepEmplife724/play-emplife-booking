import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { MsGraphService } from 'src/lib/msgraph.service';
import { CreateBookingDto } from '../dtos';

@Injectable()
export class BookingRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly graphApi: MsGraphService,
  ) {}

  async getAvailableTimeSlots(userId: string) {
    return this.graphApi.getAvailableTimeSlots(userId);
  }

  async createBookingWithProjectManger(createBookingDto: CreateBookingDto) {
    const booking =
      await this.graphApi.createBookingWithProjectManger(createBookingDto);
    return this.prismaService.booking.create({
      data: {
        external_id: booking.id,
        project_manager_id: createBookingDto.projectManagerId,
        project_manager_email: booking.organizer.emailAddress.address,
        project_manager_name: booking.organizer.emailAddress.name,
        student_email: createBookingDto.studentEmail,
        start_time: booking.start.dateTime,
        end_time: booking.end.dateTime,
        time_zone: booking.originalStartTimeZone,
        join_url: booking.onlineMeeting.joinUrl,
      },
    });
  }
}
