import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsEnum,
    IsOptional,
} from 'class-validator';
import {
    AdditionalServiceCapability,
    CatSize,
    DogSize,
    PetAgeGroup,
} from '@pet-care/shared';

export class CreatePetSittingPolicyDto {
    @ApiProperty({ enum: DogSize, isArray: true })
    @IsArray()
    @ArrayUnique()
    @IsEnum(DogSize, { each: true })
    acceptedDogSizes: DogSize[];

    @ApiProperty({ enum: CatSize, isArray: true })
    @IsArray()
    @ArrayUnique()
    @IsEnum(CatSize, { each: true })
    acceptedCatSizes: CatSize[];

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
}
