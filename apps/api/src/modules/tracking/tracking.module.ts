import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingController } from './tracking.controller';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './tracking.repository';
import { TrackingSession } from './entities/tracking-session.entity';
import { WalkSegment } from './entities/walk-segment.entity';
import { TrackPoint } from './entities/track-point.entity';
import { GeoModule } from '../geo/geo.module';

@Module({
    imports: [TypeOrmModule.forFeature([TrackingSession, WalkSegment, TrackPoint]), GeoModule],
    controllers: [TrackingController],
    providers: [TrackingGateway, TrackingService, TrackingRepository],
    exports: [TrackingService],
})
export class TrackingModule {}
