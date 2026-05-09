import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Min,
    ValidateNested,
} from 'class-validator';
import { PriceUnit } from '@pet-care/shared';
import { CreateSizeSurchargeDto } from '../size-surcharges/dto/create-size-surcharge.dto';
import { CreateServiceAddonDto } from '../addons/dto/create-service-addon.dto';
import { CreateWalkingPolicyDto } from '../policies/dto/create-walking-policy.dto';
import { CreatePetSittingPolicyDto } from '../policies/dto/create-pet-sitting-policy.dto';
import { CreateBoardingPolicyDto } from '../policies/dto/create-boarding-policy.dto';

// Окремий tier-DTO для update: на відміну від create, кожен запис може мати
// `id` (тоді це існуючий tier — оновлюємо). Tier без id трактуємо як новий.
// Tiers, що є в БД, але відсутні у вхідному payload-і, видаляємо — за умови,
// що жодне Booking на них не посилається (інакше FK RESTRICT кине 409).
export class UpdateServiceTierDto {
    @ApiPropertyOptional({ description: 'ID існуючого tier-у. Без id — новий tier.' })
    @IsOptional()
    @IsUUID()
    id?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    durationMinutes?: number;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    basePrice: number;

    @ApiProperty({ enum: PriceUnit })
    @IsEnum(PriceUnit)
    priceUnit: PriceUnit;
}

// PATCH /services/:id — повна замінe залежностей offering-у. Кожне з полів
// optional: відсутнє поле означає «не чіпати», порожній масив означає
// «видалити всі». serviceType змінювати не можна (FK у Booking тощо).
export class UpdateServiceOfferingDto {
    @ApiPropertyOptional({ nullable: true })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiPropertyOptional({ type: [UpdateServiceTierDto], minItems: 1 })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => UpdateServiceTierDto)
    tiers?: UpdateServiceTierDto[];

    @ApiPropertyOptional({ type: [CreateSizeSurchargeDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSizeSurchargeDto)
    sizeSurcharges?: CreateSizeSurchargeDto[];

    @ApiPropertyOptional({ type: [CreateServiceAddonDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateServiceAddonDto)
    addons?: CreateServiceAddonDto[];

    @ApiPropertyOptional({ type: () => CreateWalkingPolicyDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateWalkingPolicyDto)
    walkingPolicy?: CreateWalkingPolicyDto;

    @ApiPropertyOptional({ type: () => CreatePetSittingPolicyDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreatePetSittingPolicyDto)
    petSittingPolicy?: CreatePetSittingPolicyDto;

    @ApiPropertyOptional({ type: () => CreateBoardingPolicyDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateBoardingPolicyDto)
    boardingPolicy?: CreateBoardingPolicyDto;
}
