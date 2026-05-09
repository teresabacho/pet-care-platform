import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { AddonPriceUnit } from '@pet-care/shared';

export class CreateServiceAddonDto {
    @ApiProperty({ minLength: 1, maxLength: 255 })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({ enum: AddonPriceUnit })
    @IsEnum(AddonPriceUnit)
    priceUnit: AddonPriceUnit;
}
