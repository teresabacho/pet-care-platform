import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingsRepository } from './bookings.repository';
import { Booking } from './entities/booking.entity';
import { Pet } from '../pets/entities/pet.entity';
import { TrackingModule } from '../tracking/tracking.module';
import { ServicesModule } from '../services/services.module';
import { ChatModule } from '../chat/chat.module';
import { BookingPricingService } from './booking-pricing.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Booking, Pet]),
        TrackingModule,
        ServicesModule,
        ChatModule,
    ],
    controllers: [BookingsController],
    providers: [BookingsService, BookingsRepository, BookingPricingService],
    exports: [BookingsService],
})
export class BookingsModule {}
