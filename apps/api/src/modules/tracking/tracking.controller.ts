import {
    Controller, Get, Logger, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';
import { GpsEmulatorService } from './emulator/gps-emulator.service';

@ApiTags('tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
    private readonly logger = new Logger(TrackingController.name);

    constructor(
        private readonly trackingService: TrackingService,
        private readonly trackingGateway: TrackingGateway,
        private readonly gpsEmulator: GpsEmulatorService,
    ) {}

    @Post('sessions/:sessionId/walk-segments')
    @ApiOperation({ summary: 'Start a new walk segment (caretaker only)' })
    @ApiResponse({ status: 201, description: 'Walk segment created' })
    @ApiResponse({ status: 400, description: 'Session not active' })
    @ApiResponse({ status: 409, description: 'Active segment already exists' })
    async startWalkSegment(
        @Param('sessionId') sessionId: string,
        @CurrentUser('id') caretakerId: string,
    ) {
        const segment = await this.trackingService.startWalkSegment(sessionId, caretakerId);
        // Не блокуємо створення сегменту якщо emit/emulator зі своєї сторони не подужали.
        try {
            this.trackingGateway.emitWalkStarted(segment.sessionId, segment.id);
        } catch (err) {
            this.logger.warn(`emitWalkStarted failed: ${(err as Error).message}`);
        }
        try {
            this.gpsEmulator.start(segment.sessionId, segment.id);
        } catch (err) {
            this.logger.warn(`gpsEmulator.start failed: ${(err as Error).message}`);
        }
        return segment;
    }

    @Patch('walk-segments/:segmentId/complete')
    @ApiOperation({ summary: 'Complete a walk segment (caretaker only)' })
    @ApiResponse({ status: 200, description: 'Segment completed with distance' })
    @ApiResponse({ status: 400, description: 'Segment already completed' })
    async completeWalkSegment(
        @Param('segmentId') segmentId: string,
        @CurrentUser('id') caretakerId: string,
    ) {
        const segment = await this.trackingService.completeWalkSegment(segmentId, caretakerId);
        try {
            this.trackingGateway.emitWalkEnded(segment.sessionId, segment.id);
        } catch (err) {
            this.logger.warn(`emitWalkEnded failed: ${(err as Error).message}`);
        }
        try {
            this.gpsEmulator.stop(segment.sessionId);
        } catch (err) {
            this.logger.warn(`gpsEmulator.stop failed: ${(err as Error).message}`);
        }
        return segment;
    }

    @Get('sessions/booking/:bookingId')
    @ApiOperation({ summary: 'Get tracking session with segments by booking ID' })
    @ApiResponse({ status: 200, description: 'Session and walk segments' })
    @ApiResponse({ status: 404, description: 'Session not found' })
    getSessionByBookingId(@Param('bookingId') bookingId: string) {
        return this.trackingService.getSessionByBookingId(bookingId);
    }

    @Get('sessions/:sessionId/points')
    @ApiOperation({ summary: 'Get GPS track points for a session or specific segment' })
    @ApiQuery({ name: 'segmentId', required: false, description: 'Filter by walk segment' })
    @ApiResponse({ status: 200, description: 'List of track points' })
    getPoints(
        @Param('sessionId') sessionId: string,
        @Query('segmentId') segmentId?: string,
    ) {
        return this.trackingService.getPoints(sessionId, segmentId);
    }
}
