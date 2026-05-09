import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    Max,
    Min,
} from 'class-validator';
import {
    AdditionalServiceCapability,
    CatSize,
    DogSize,
    PetAgeGroup,
} from '@pet-care/shared';

export class CreateWalkingPolicyDto {
    @ApiProperty({ enum: DogSize, isArray: true })
    @IsArray()
    @ArrayUnique()
    @IsEnum(DogSize, { each: true })
    acceptedDogSizes: DogSize[];

    @ApiPropertyOptional({ enum: CatSize, isArray: true })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(CatSize, { each: true })
    acceptedCatSizes?: CatSize[];

    @ApiProperty({ enum: PetAgeGroup, isArray: true })
    @IsArray()
    @ArrayUnique()
    @IsEnum(PetAgeGroup, { each: true })
    acceptedAgeGroups: PetAgeGroup[];

    @ApiProperty()
    @IsBoolean()
    acceptsSpecialNeedsPets: boolean;

    @ApiPropertyOptional({ enum: AdditionalServiceCapability, isArray: true })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(AdditionalServiceCapability, { each: true })
    capabilities?: AdditionalServiceCapability[];

    @ApiProperty({ minimum: 1, maximum: 10, default: 1 })
    @IsInt()
    @Min(1)
    @Max(10)
    maxDogsAtOnce: number;
}
