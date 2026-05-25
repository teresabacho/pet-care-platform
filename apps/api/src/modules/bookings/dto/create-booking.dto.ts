import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsDate,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';
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

    @ApiProperty({ description: 'ID обраного ServiceTier' })
    @IsUUID()
    tierId: string;

    @ApiPropertyOptional({
        type: [String],
        description: 'UUID-и обраних ServiceAddon-ів',
        default: [],
    })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsUUID('4', { each: true })
    addonIds?: string[];

    @ApiProperty({ example: '2026-03-01T10:00:00.000Z' })
    @Type(() => Date)
    @IsDate()
    scheduledStart: Date;

    @ApiProperty({ example: '2026-03-01T11:00:00.000Z' })
    @Type(() => Date)
    @IsDate()
    scheduledEnd: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}
