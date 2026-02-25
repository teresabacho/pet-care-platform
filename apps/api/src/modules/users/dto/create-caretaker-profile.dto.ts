import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType } from '@pet-care/shared';

export class CreateCaretakerProfileDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    experienceYears?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    hourlyRate?: number;

    @ApiPropertyOptional({ enum: ServiceType, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(ServiceType, { each: true })
    serviceTypes?: ServiceType[];

    @ApiPropertyOptional({ description: 'Широта (latitude)' })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    serviceLatitude?: number;

    @ApiPropertyOptional({ description: 'Довгота (longitude)' })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    serviceLongitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    radiusKm?: number;
}
