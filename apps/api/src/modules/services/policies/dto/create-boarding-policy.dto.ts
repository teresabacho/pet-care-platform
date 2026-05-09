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
    HomeCondition,
    PetAgeGroup,
} from '@pet-care/shared';
import { NoConflictingHomeConditions } from '../../../../common/validators/no-conflicting-home-conditions.validator';

export class CreateBoardingPolicyDto {
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

    @ApiProperty({
        enum: HomeCondition,
        isArray: true,
        description:
            'Не можна одночасно вказувати конфліктні пари (наприклад HAS_KIDS і NO_KIDS).',
    })
    @IsArray()
    @ArrayUnique()
    @IsEnum(HomeCondition, { each: true })
    @NoConflictingHomeConditions()
    homeConditions: HomeCondition[];
}
