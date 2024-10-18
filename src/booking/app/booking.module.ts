import { Module } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { BookingController } from '../controllers/booking.controller';
import { BookingRepository } from '../repositories/booking.repository';
import { MsGraphService } from 'src/lib/msgraph.service';

@Module({
  controllers: [BookingController],
  providers: [PrismaService, BookingRepository, MsGraphService],
})
export class BookingModule {}
