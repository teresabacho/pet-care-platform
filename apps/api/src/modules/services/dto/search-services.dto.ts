import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ServiceType } from '@pet-care/shared';

export class SearchServicesDto {
    @ApiPropertyOptional({ enum: ServiceType })
    @IsOptional()
    @IsEnum(ServiceType)
    type?: ServiceType;

    @ApiPropertyOptional({ example: 50.4501, description: 'Широта (latitude)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    lat?: number;

    @ApiPropertyOptional({ example: 30.5234, description: 'Довгота (longitude)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    lng?: number;

    @ApiPropertyOptional({ example: 5, description: 'Радіус пошуку в кілометрах' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0.1)
    radiusKm?: number;
}
