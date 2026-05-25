import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    ValidateIf,
} from 'class-validator';
import { MessageType } from '@pet-care/shared';

export class SendMessageDto {
    @ApiProperty({ enum: MessageType, default: MessageType.TEXT })
    @IsEnum(MessageType)
    messageType: MessageType;

    // Обов'язкове якщо TEXT; для MEDIA — caption опціональний.
    @ApiPropertyOptional({ description: 'Текст повідомлення (caption для MEDIA)' })
    @ValidateIf((o) => o.messageType === MessageType.TEXT)
    @IsString()
    @MaxLength(4000)
    @ValidateIf((o) => o.messageType !== MessageType.TEXT)
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    text?: string;

    @ApiPropertyOptional({ type: [String], description: 'ID MediaItem-ів (для MEDIA)' })
    @ValidateIf((o) => o.messageType === MessageType.MEDIA)
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    @ValidateIf((o) => o.messageType !== MessageType.MEDIA)
    @IsOptional()
    mediaItemIds?: string[];
}
