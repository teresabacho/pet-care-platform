import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ServiceType } from '@pet-care/shared';

export class CreateBookingDto {
    @ApiProperty({ description: 'ID виконавця (userId)' })
    @IsUUID()
    caretakerId: string;

    @ApiProperty({ description: 'ID тварини' })
    @IsUUID()
    petId: string;

    @ApiProperty({ enum: ServiceType })
    @IsEnum(ServiceType)
    serviceType: ServiceType;

    @ApiProperty({ example: '2026-03-01T10:00:00.000Z' })
    @Type(() => Date)
    @IsDate()
    scheduledStart: Date;

    @ApiProperty({ example: '2026-03-01T11:00:00.000Z' })
    @Type(() => Date)
    @IsDate()
    scheduledEnd: Date;

    @ApiProperty({ example: 150 })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}
