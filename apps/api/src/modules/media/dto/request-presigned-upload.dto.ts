import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
    IsString,
    IsUUID,
    Max,
    Min,
} from 'class-validator';
import { MediaOwnerType, MediaType } from '@pet-care/shared';

export class RequestPresignedUploadDto {
    @ApiProperty({ enum: MediaOwnerType })
    @IsEnum(MediaOwnerType)
    ownerType: MediaOwnerType;

    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    ownerId: string;

    @ApiProperty({ enum: MediaType, description: 'IMAGE або VIDEO' })
    @IsEnum(MediaType)
    mediaType: MediaType;

    @ApiProperty({ example: 'video/mp4' })
    @IsString()
    mimeType: string;

    @ApiProperty({ example: 12_500_000 })
    @IsInt()
    @Min(1)
    @Max(200 * 1024 * 1024)
    sizeBytes: number;
}
