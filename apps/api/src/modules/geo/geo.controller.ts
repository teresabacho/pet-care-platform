import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GeoService } from './geo.service';
import { CreateGeofenceDto } from './dto/create-geofence.dto';

@ApiTags('geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('geo')
export class GeoController {
    constructor(private readonly geoService: GeoService) {}

    @Post('geofences')
    @ApiOperation({ summary: 'Create a geofence for a tracking session (owner only)' })
    @ApiResponse({ status: 201, description: 'Geofence created' })
    @ApiResponse({ status: 403, description: 'Not the session owner' })
    createGeofence(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateGeofenceDto,
    ) {
        return this.geoService.createGeofence(userId, dto);
    }

    @Get('geofences/session/:sessionId')
    @ApiOperation({ summary: 'Get geofence for a tracking session' })
    @ApiResponse({ status: 200, description: 'Geofence or null' })
    getGeofence(@Param('sessionId') sessionId: string) {
        return this.geoService.getGeofenceBySession(sessionId);
    }

    @Delete('geofences/:id')
    @ApiOperation({ summary: 'Delete a geofence' })
    @ApiResponse({ status: 200, description: 'Geofence deleted' })
    deleteGeofence(
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.geoService.deleteGeofence(id, userId);
    }

    @Get('stats/walk/:segmentId')
    @ApiOperation({ summary: 'Get statistics for a single walk segment' })
    @ApiResponse({ status: 200, description: 'Distance, duration, speed stats' })
    getWalkStats(@Param('segmentId') segmentId: string) {
        return this.geoService.getWalkStats(segmentId);
    }

    @Get('stats/session/:sessionId')
    @ApiOperation({ summary: 'Get aggregated session statistics' })
    @ApiResponse({ status: 200, description: 'Total walks, distance, duration' })
    getSessionStats(@Param('sessionId') sessionId: string) {
        return this.geoService.getSessionStats(sessionId);
    }

    @Get('route/:segmentId')
    @ApiOperation({ summary: 'Get walk route as GeoJSON (for Leaflet)' })
    @ApiResponse({ status: 200, description: 'GeoJSON LineString' })
    getRouteGeoJSON(@Param('segmentId') segmentId: string) {
        return this.geoService.getRouteGeoJSON(segmentId);
    }

    @Get('stats/deviation/:segmentId')
    @ApiOperation({ summary: 'Get maximum deviation from geofence center for a walk segment' })
    @ApiQuery({ name: 'geofenceId', required: true, description: 'Geofence ID to measure against' })
    @ApiResponse({ status: 200, description: 'Max deviation in meters' })
    getMaxDeviation(
        @Param('segmentId') segmentId: string,
        @Query('geofenceId') geofenceId: string,
    ) {
        return this.geoService.getMaxDeviation(segmentId, geofenceId);
    }
}
