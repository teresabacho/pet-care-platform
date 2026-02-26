import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class CreateGeofenceDto {
    @ApiProperty({ description: 'ID of the tracking session' })
    @IsUUID()
    sessionId: string;

    @ApiProperty({ example: 50.4501, description: 'Center latitude' })
    @IsNumber()
    @Min(-90)
    @Max(90)
    centerLat: number;

    @ApiProperty({ example: 30.5234, description: 'Center longitude' })
    @IsNumber()
    @Min(-180)
    @Max(180)
    centerLng: number;

    @ApiProperty({ example: 500, description: 'Safe zone radius in meters' })
    @IsNumber()
    @Min(10)
    radiusMeters: number;
}
