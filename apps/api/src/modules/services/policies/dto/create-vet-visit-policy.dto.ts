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
    BirdType,
    CatSize,
    DogSize,
    OtherPetType,
    PetAgeGroup,
    RodentType,
} from '@pet-care/shared';

export class CreateVetVisitPolicyDto {
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

    @ApiPropertyOptional({ enum: RodentType, isArray: true })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(RodentType, { each: true })
    acceptedRodentTypes?: RodentType[];

    @ApiPropertyOptional({ enum: BirdType, isArray: true })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(BirdType, { each: true })
    acceptedBirdTypes?: BirdType[];

    @ApiPropertyOptional({ enum: OtherPetType, isArray: true })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(OtherPetType, { each: true })
    acceptedOtherPetTypes?: OtherPetType[];
}
