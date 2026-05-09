import { IsEnum, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CertificateType } from '@pet-care/shared';

export class CreateCertificateDto {
    @ApiProperty({ enum: CertificateType })
    @IsEnum(CertificateType)
    type: CertificateType;

    @ApiProperty({ minLength: 1, maxLength: 255 })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    title: string;

    @ApiProperty({ description: 'ID завантаженого MediaItem (PENDING або READY)' })
    @IsUUID()
    mediaItemId: string;
}
