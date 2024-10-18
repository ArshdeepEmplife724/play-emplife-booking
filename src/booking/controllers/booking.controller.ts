import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BookingRepository } from '../repositories/booking.repository';
import { CreateBookingDto } from '../dtos';

@Controller('booking/pm')
export class BookingController {
  constructor(private readonly bookingRepository: BookingRepository) {}

  @Get('timeSlots/:id')
  async getAvailableTimeSlots(@Param('id') userId: string) {
    return this.bookingRepository.getAvailableTimeSlots(userId);
  }

  @Post()
  async createBooking(@Body() body: CreateBookingDto) {
    return this.bookingRepository.createBookingWithProjectManger(body);
  }
}
