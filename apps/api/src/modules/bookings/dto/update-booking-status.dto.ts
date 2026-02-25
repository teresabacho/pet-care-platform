import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BookingStatus } from '@pet-care/shared';

export class UpdateBookingStatusDto {
    @ApiProperty({ enum: BookingStatus })
    @IsEnum(BookingStatus)
    status: BookingStatus;
}
