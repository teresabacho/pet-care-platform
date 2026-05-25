import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartConversationDto {
    @ApiProperty({ description: 'ID іншого користувача' })
    @IsUUID()
    otherUserId: string;
}
