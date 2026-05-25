import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BookingStatus } from '@pet-care/shared';

export class UpdateBookingStatusDto {
    @ApiProperty({ enum: BookingStatus })
    @IsEnum(BookingStatus)
    status: BookingStatus;

    @ApiPropertyOptional({
        description: 'Обовʼязково для скасування — текст причини',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    cancellationReason?: string;
}
