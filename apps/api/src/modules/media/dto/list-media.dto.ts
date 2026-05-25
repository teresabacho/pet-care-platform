import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { MediaOwnerType } from '@pet-care/shared';

export class ListMediaDto {
    @ApiProperty({ enum: MediaOwnerType })
    @IsEnum(MediaOwnerType)
    ownerType: MediaOwnerType;

    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    ownerId: string;
}
