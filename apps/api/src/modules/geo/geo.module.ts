import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { GeoRepository } from './geo.repository';
import { Geofence } from './entities/geofence.entity';
import { TrackingSession } from '../tracking/entities/tracking-session.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Geofence, TrackingSession])],
    controllers: [GeoController],
    providers: [GeoService, GeoRepository],
    exports: [GeoService],
})
export class GeoModule {}
