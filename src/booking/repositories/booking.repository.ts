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

  async getTimeSlots(userId: string, teamId: string) {
    const timeSlots: any[] = await this.graphApi.getTimeSlots(userId, teamId);
    const startDateTime = new Date()
      .toISOString()
      .replace(/T.+Z/, 'T00:00:00.000Z');
    const endDateTime = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const previousBookings = await this.prismaService.booking.findMany({
      where: {
        team_id: teamId,
        start_time: {
          gte: startDateTime,
        },
        end_time: {
          lte: endDateTime,
        },
      },
      select: {
        id: true,
        start_time: true,
        end_time: true,
        student_name: true,
        student_email: true,
        student_id: true,
      },
    });
    previousBookings.map((pb) => {
      timeSlots.push({
        id: pb.id,
        available: false,
        start: pb.start_time,
        end: pb.end_time,
        bookedBy: {
          id: pb.student_id,
          name: pb.student_name,
          email: pb.student_email,
        },
      });
    });
    return timeSlots.sort((a, b) => +new Date(a.start) - +new Date(b.start));
  }

  async createBookingWithProjectManger(createBookingDto: CreateBookingDto) {
    const booking =
      await this.graphApi.createBookingWithProjectManger(createBookingDto);
    return this.prismaService.booking.create({
      data: {
        external_id: booking.id,
        subject: booking.subject,
        project_manager_id: createBookingDto.projectManagerId,
        project_manager_email: booking.organizer.emailAddress.address,
        project_manager_name: booking.organizer.emailAddress.name,
        student_email: createBookingDto.studentEmail,
        student_id: createBookingDto.studentId,
        student_name: createBookingDto.studentName,
        team_id: createBookingDto.teamId,
        start_time: booking.start.dateTime,
        end_time: booking.end.dateTime,
        time_zone: booking.originalStartTimeZone,
        join_url: booking.onlineMeeting.joinUrl,
      },
    });
  }
}
