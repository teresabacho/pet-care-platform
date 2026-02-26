import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingsRepository } from './bookings.repository';
import { Booking } from './entities/booking.entity';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
    imports: [TypeOrmModule.forFeature([Booking]), TrackingModule],
    controllers: [BookingsController],
    providers: [BookingsService, BookingsRepository],
    exports: [BookingsService],
})
export class BookingsModule {}
