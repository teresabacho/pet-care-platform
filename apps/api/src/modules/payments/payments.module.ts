import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Booking } from '../bookings/entities/booking.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { LiqPayClient } from './liqpay-client';

@Module({
    imports: [TypeOrmModule.forFeature([Booking]), ConfigModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, LiqPayClient],
    exports: [PaymentsService],
})
export class PaymentsModule {}
