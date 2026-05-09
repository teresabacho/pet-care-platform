import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateServiceInclusionDto {
    @ApiProperty({ minLength: 1, maxLength: 255 })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    text: string;
}
