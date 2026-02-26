import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateWalkSegmentDto {
    @ApiProperty({ description: 'ID of the tracking session' })
    @IsUUID()
    sessionId: string;
}
