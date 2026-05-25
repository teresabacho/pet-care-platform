import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { capitalizeName } from '../../../common/transforms';

const SUPPORTED_COUNTRIES = ['UA', 'PL', 'HU'] as const;

export class UpdateUserDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Transform(({ value }) => capitalizeName(value))
    firstName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Transform(({ value }) => capitalizeName(value))
    lastName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: 'https://i.redd.it/qh4lk77bpelc1.jpeg' })
    @IsOptional()
    @IsUrl()
    avatarUrl?: string;

    @ApiPropertyOptional({ enum: SUPPORTED_COUNTRIES })
    @IsOptional()
    @IsIn(SUPPORTED_COUNTRIES as unknown as string[])
    country?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(120)
    city?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    street?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    apartment?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    floor?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    entrance?: string;
}
