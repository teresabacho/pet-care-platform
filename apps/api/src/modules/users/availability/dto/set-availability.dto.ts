import {
    ArrayUnique,
    IsArray,
    IsDateString,
    IsEnum,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AvailabilitySlot } from '@pet-care/shared';

export class AvailabilityDayDto {
    @ApiProperty({ description: 'Дата у форматі YYYY-MM-DD' })
    @IsDateString()
    date: string;

    @ApiProperty({ enum: AvailabilitySlot, isArray: true })
    @IsArray()
    @ArrayUnique()
    @IsEnum(AvailabilitySlot, { each: true })
    slots: AvailabilitySlot[];
}

export class SetAvailabilityDto {
    @ApiProperty({ type: [AvailabilityDayDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AvailabilityDayDto)
    days: AvailabilityDayDto[];
}
