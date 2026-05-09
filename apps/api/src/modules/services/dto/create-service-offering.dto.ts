import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { ServiceType } from '@pet-care/shared';
import { CreateServiceTierDto } from '../tiers/dto/create-service-tier.dto';
import { CreateSizeSurchargeDto } from '../size-surcharges/dto/create-size-surcharge.dto';
import { CreateServiceAddonDto } from '../addons/dto/create-service-addon.dto';
import { CreateWalkingPolicyDto } from '../policies/dto/create-walking-policy.dto';
import { CreatePetSittingPolicyDto } from '../policies/dto/create-pet-sitting-policy.dto';
import { CreateBoardingPolicyDto } from '../policies/dto/create-boarding-policy.dto';

// Об'єднаний DTO: створюється весь offering із залежностями за один POST.
// ServicesService.create перевіряє, що передано лише ту policy, яка відповідає
// serviceType (наприклад WALKING → walkingPolicy, не boardingPolicy).
export class CreateServiceOfferingDto {
    @ApiProperty({ enum: ServiceType, example: ServiceType.WALKING })
    @IsEnum(ServiceType)
    serviceType: ServiceType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ type: [CreateServiceTierDto], minItems: 1 })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateServiceTierDto)
    tiers: CreateServiceTierDto[];

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
