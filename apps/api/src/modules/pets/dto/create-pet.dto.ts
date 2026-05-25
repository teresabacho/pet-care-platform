import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    Min,
} from 'class-validator';
import { capitalizeName } from '../../../common/transforms';

export class CreatePetDto {
    @ApiProperty({ example: 'Барсик' })
    @IsString()
    @Transform(({ value }) => capitalizeName(value))
    name: string;

    @ApiPropertyOptional({ example: 'dog', description: 'dog | cat | bird | rodent | other' })
    @IsOptional()
    @IsString()
    species?: string;

    @ApiPropertyOptional({ example: 'Лабрадор' })
    @IsOptional()
    @IsString()
    breed?: string;

    @ApiPropertyOptional({ example: 3, description: 'Вік у роках' })
    @IsOptional()
    @IsInt()
    @Min(0)
    age?: number;

    @ApiPropertyOptional({ example: 6, description: 'Місяці (0–11) на додачу до років' })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(11)
    ageMonths?: number;

    @ApiPropertyOptional({ example: 4.5, description: 'Вага у кілограмах' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    weight?: number;

    @ApiPropertyOptional({ example: 'male', description: 'male | female' })
    @IsOptional()
    @IsString()
    sex?: string;

    @ApiPropertyOptional({
        description: 'Розмір тваринки: для DOG — DogSize, для CAT — CatSize',
        example: 'MEDIUM',
    })
    @IsOptional()
    @IsString()
    size?: string;

    @ApiPropertyOptional({ example: 'yes', description: 'yes | no | unknown' })
    @IsOptional()
    @IsString()
    neutered?: string;

    @ApiPropertyOptional({ example: '2023-04-15', description: 'Дата появи у родині (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    dateAcquired?: string;

    @ApiPropertyOptional({ example: 'гарний' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 'https://i.redd.it/qh4lk77bpelc1.jpeg' })
    @IsOptional()
    @IsUrl()
    photoUrl?: string;

    @ApiPropertyOptional({ example: 'Алергія на курку' })
    @IsOptional()
    @IsString()
    specialNeeds?: string;

    @ApiPropertyOptional({
        description:
            'Додаткові структуровані деталі (поведінка, догляд, медикаменти тощо). Зберігається як jsonb.',
    })
    @IsOptional()
    @IsObject()
    details?: Record<string, unknown>;
}
