import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BookingRepository } from '../repositories/booking.repository';
import { CreateBookingDto } from '../dtos';

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

  @Post()
  async createBooking(@Body() body: CreateBookingDto) {
    return this.bookingRepository.createBookingWithProjectManger(body);
  }
}
