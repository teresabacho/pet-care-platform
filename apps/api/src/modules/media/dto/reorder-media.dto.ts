import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsUUID } from 'class-validator';
import { MediaOwnerType } from '@pet-care/shared';

export class ReorderMediaDto {
    @ApiProperty({ enum: MediaOwnerType })
    @IsEnum(MediaOwnerType)
    ownerType: MediaOwnerType;

    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    ownerId: string;

    @ApiProperty({ type: [String], format: 'uuid' })
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID(undefined, { each: true })
    ids: string[];
}
