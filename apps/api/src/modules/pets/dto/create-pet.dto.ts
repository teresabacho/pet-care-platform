import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreatePetDto {
    @ApiProperty({ example: 'Барсик' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'Кіт' })
    @IsOptional()
    @IsString()
    species?: string;

    @ApiPropertyOptional({ example: 'Британська короткошерста' })
    @IsOptional()
    @IsString()
    breed?: string;

    @ApiPropertyOptional({ example: 3, description: 'Вік у роках' })
    @IsOptional()
    @IsInt()
    @Min(0)
    age?: number;

    @ApiPropertyOptional({ example: 4.5, description: 'Вага у кілограмах' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    weight?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUrl()
    photoUrl?: string;

    @ApiPropertyOptional({ example: 'Алергія на курку' })
    @IsOptional()
    @IsString()
    specialNeeds?: string;
}
