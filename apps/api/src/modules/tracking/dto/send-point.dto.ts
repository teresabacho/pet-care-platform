import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class SendPointDto {
    @ApiProperty({ description: 'ID tracking session' })
    @IsUUID()
    sessionId: string;

    @ApiProperty({ example: 50.4501, description: 'Latitude' })
    @IsNumber()
    lat: number;

    @ApiProperty({ example: 30.5234, description: 'Longitude' })
    @IsNumber()
    lng: number;

    @ApiPropertyOptional({ example: 150.5, description: 'Altitude in meters' })
    @IsOptional()
    @IsNumber()
    altitude?: number;

    @ApiPropertyOptional({ example: 1.5, description: 'Speed in m/s' })
    @IsOptional()
    @IsNumber()
    speed?: number;

    @ApiProperty({ example: '2026-02-26T10:00:00.000Z', description: 'Timestamp from GPS device' })
    @IsDateString()
    timestamp: string;
}
