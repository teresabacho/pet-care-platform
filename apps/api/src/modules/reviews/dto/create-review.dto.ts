import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateReviewDto {
    @ApiProperty({ description: 'ID букінгу за яким залишається відгук' })
    @IsUUID()
    bookingId: string;

    @ApiProperty({ example: 5, description: 'Оцінка від 1 до 5' })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({ example: 'Дуже задоволена!' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ example: 'Чудовий виконавець, рекомендую!' })
    @IsOptional()
    @IsString()
    comment?: string;
}
