import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { MsGraphService } from 'src/lib/msgraph.service';
import {
  CreateBookingDto,
  CreateBookingWindowDto,
  RescheduleBookingDto,
} from '../dtos';

@Injectable()
export class BookingRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly graphApi: MsGraphService,
  ) {}

  private createWindowTimeSlots(
    windowStartDate: string,
    windowEndDate: string,
    slotDuration: number,
    breakDuration: number,
    numberOfStudents: number,
  ): {
    startDateTime: string;
    endDateTime: string;
  }[] {
    const windowStart = new Date(windowStartDate);
    const windowEnd = new Date(windowEndDate);

    if (isNaN(windowStart.getTime())) {
      throw new BadRequestException(
        `Invalid start time format: ${windowStartDate}`,
      );
    }
    if (isNaN(windowEnd.getTime())) {
      throw new BadRequestException(
        `Invalid end time format: ${windowEndDate}`,
      );
    }

    if (windowEnd <= windowStart) {
      throw new BadRequestException('End time must be after start time');
    }

    if (numberOfStudents <= 0) {
      throw new BadRequestException(
        'Number of students must be greater than 0',
      );
    }

    const totalWindowMinutes =
      (windowEnd.getTime() - windowStart.getTime()) / 60000;

    const timeForOneStudentWithBreak = slotDuration + breakDuration;
    const maxPossibleStudents = Math.floor(
      (totalWindowMinutes + breakDuration) / timeForOneStudentWithBreak,
    );

    if (maxPossibleStudents === 0) {
      throw new BadRequestException(
        `Window is too small to accommodate even one student with ${slotDuration} minute slot. ` +
          `Window length: ${totalWindowMinutes} minutes`,
      );
    }
    if (numberOfStudents > maxPossibleStudents) {
      const timeNeededForAllStudents =
        (numberOfStudents - 1) * (slotDuration + breakDuration) + slotDuration;
      const additionalMinutesNeeded =
        timeNeededForAllStudents - totalWindowMinutes;

      throw new BadRequestException(
        `Cannot accommodate ${numberOfStudents} students in the given window. ` +
          `Maximum possible students: ${maxPossibleStudents} with ${slotDuration} minute slots ` +
          `and ${breakDuration} minute breaks. ` +
          `Window length: ${totalWindowMinutes} minutes. ` +
          `Need ${additionalMinutesNeeded} more minutes to accommodate all students.`,
      );
    }
    const totalTimeNeeded =
      numberOfStudents * slotDuration + (numberOfStudents - 1) * breakDuration;

    if (totalTimeNeeded > totalWindowMinutes) {
      throw new BadRequestException(
        `Cannot fit ${numberOfStudents} slots of ${slotDuration} minutes with ` +
          `${breakDuration} minute breaks in the given window (${totalWindowMinutes} minutes). ` +
          `Need ${totalTimeNeeded} minutes.\n` +
          `Window: ${windowStart.toISOString()} to ${windowEnd.toISOString()}`,
      );
    }

    const slots: {
      startDateTime: string;
      endDateTime: string;
    }[] = [];
    let currentTime = new Date(windowStart);

    for (let i = 0; i < numberOfStudents; i++) {
      const potentialSlotEnd = new Date(
        currentTime.getTime() + slotDuration * 60000,
      );
      if (potentialSlotEnd > windowEnd) {
        throw new BadRequestException(
          `Slot ${i + 1} would exceed the specified window end time`,
        );
      }

      const slotStart = new Date(currentTime);
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);

      slots.push({
        startDateTime: slotStart.toISOString(),
        endDateTime: slotEnd.toISOString(),
      });

      if (i < numberOfStudents - 1) {
        currentTime = new Date(slotEnd.getTime() + breakDuration * 60000);
        if (currentTime > windowEnd) {
          throw new BadRequestException(
            `Break after slot ${i + 1} would exceed the specified window end time`,
          );
        }
      }
    }
    return slots;
  }

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
        external_id: true,
        start_time: true,
        end_time: true,
        student_name: true,
        student_email: true,
        student_id: true,
      },
    });
    previousBookings.map((pb) => {
      timeSlots.push({
        id: pb.external_id,
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

  async createBookingWindow(createBookingWindowDto: CreateBookingWindowDto) {
    const timeSlots = this.createWindowTimeSlots(
      createBookingWindowDto.windowStartDate,
      createBookingWindowDto.windowEndDate,
      createBookingWindowDto.slotDuration,
      createBookingWindowDto.breakDuration,
      createBookingWindowDto.numberOfStudents,
    );
    if (createBookingWindowDto.previewSlots === true) {
      return timeSlots;
    }
    await this.graphApi.createBookingWindow(
      timeSlots,
      createBookingWindowDto.teamName,
      createBookingWindowDto.teamId,
      createBookingWindowDto.projectManagerId,
    );
    return timeSlots;
  }

  async rescheduleBooking(rescheduleBookingDto: RescheduleBookingDto) {
    const updatedBooking = await this.graphApi.rescheduleEvent(
      rescheduleBookingDto.startDateTime,
      rescheduleBookingDto.endDateTime,
      rescheduleBookingDto.eventId,
      rescheduleBookingDto.projectManagerId,
    );
    return this.prismaService.booking.update({
      where: {
        external_id: updatedBooking.id,
      },
      data: {
        start_time: updatedBooking.start.dateTime,
        end_time: updatedBooking.end.dateTime,
      },
    });
  }
}
