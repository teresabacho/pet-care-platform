import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { PriceUnit } from '@pet-care/shared';

export class CreateServiceTierDto {
    @ApiPropertyOptional({
        description: 'Тривалість сеансу в хвилинах. null для денних послуг.',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    durationMinutes?: number;

    @ApiProperty({
        description: 'Базова ціна для тваринки розміру MEDIUM',
        example: 200,
    })
    @IsNumber()
    @Min(0)
    basePrice: number;

    @ApiProperty({ enum: PriceUnit })
    @IsEnum(PriceUnit)
    priceUnit: PriceUnit;
}
