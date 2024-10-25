import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BookingRepository } from '../repositories/booking.repository';
import {
  CreateBookingDto,
  CreateBookingWindowDto,
  RescheduleBookingDto,
} from '../dtos';

@Controller('booking/pm')
export class BookingController {
  constructor(private readonly bookingRepository: BookingRepository) {}

  @Get('timeSlots/:id')
  async getAvailableTimeSlots(
    @Param('id') userId: string,
    @Query('teamId') teamId: string,
  ) {
    return this.bookingRepository.getTimeSlots(userId, teamId);
  }

  @Post('window')
  async createBookingWindow(@Body() body: CreateBookingWindowDto) {
    return this.bookingRepository.createBookingWindow(body);
  }

  @Post()
  async createBooking(@Body() body: CreateBookingDto) {
    return this.bookingRepository.createBookingWithProjectManger(body);
  }

  @Patch('reschedule')
  async rescheduleBooking(@Body() body: RescheduleBookingDto) {
    return this.bookingRepository.rescheduleBooking(body);
  }
}
