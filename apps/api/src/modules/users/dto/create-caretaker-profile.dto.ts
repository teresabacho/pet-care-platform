import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsIn,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CaretakerSkill, Language, ServiceType } from '@pet-care/shared';

const SUPPORTED_COUNTRIES = ['UA', 'PL', 'HU'] as const;

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

    @ApiPropertyOptional({ enum: CaretakerSkill, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(CaretakerSkill, { each: true })
    skills?: CaretakerSkill[];

    @ApiPropertyOptional({ enum: Language, isArray: true })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(Language, { each: true })
    languages?: Language[];

    @ApiPropertyOptional({
        description: 'Дата (ISO 8601), до якої caretaker гарантує доступність.',
    })
    @IsOptional()
    @IsDateString()
    availabilityFilledUntil?: string;

    @ApiPropertyOptional({
        description: 'Чи показувати точну адресу публічно. Якщо false — координати обфускуються.',
    })
    @IsOptional()
    @IsBoolean()
    addressIsPublic?: boolean;

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

    @ApiPropertyOptional({ enum: SUPPORTED_COUNTRIES })
    @IsOptional()
    @IsIn(SUPPORTED_COUNTRIES as unknown as string[])
    country?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(120)
    city?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    street?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    apartment?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    floor?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    entrance?: string;
}
