import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PriceUnit, ServiceType } from '@pet-care/shared';

export class CreateServiceOfferingDto {
    @ApiProperty({ enum: ServiceType, example: ServiceType.WALKING })
    @IsEnum(ServiceType)
    serviceType: ServiceType;

    @ApiProperty({
        example: 150,
        description: 'Ціна в одиницях priceUnit (за сеанс / за годину / за добу)',
    })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({
        enum: PriceUnit,
        default: PriceUnit.PER_SESSION,
        description: 'PER_SESSION — за сеанс, PER_HOUR — за годину, PER_DAY — за добу (перетримка). За замовчуванням PER_SESSION.',
    })
    @IsOptional()
    @IsEnum(PriceUnit)
    priceUnit?: PriceUnit;

    @ApiPropertyOptional({
        example: 60,
        description: 'Тривалість сеансу в хвилинах (для WALKING, GROOMING, VET_VISIT). Не вказується для PER_DAY послуг.',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    durationMinutes?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;
}
