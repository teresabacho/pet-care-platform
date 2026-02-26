import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeoRepository } from './geo.repository';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { Geofence } from './entities/geofence.entity';
import { TrackingSession } from '../tracking/entities/tracking-session.entity';

@Injectable()
export class GeoService {
    constructor(
        private readonly geoRepository: GeoRepository,
        @InjectRepository(TrackingSession)
        private readonly sessionRepo: Repository<TrackingSession>,
    ) {}

    async createGeofence(userId: string, dto: CreateGeofenceDto): Promise<Geofence> {
        const session = await this.sessionRepo.findOne({
            where: { id: dto.sessionId },
            relations: ['booking'],
        });
        if (!session) throw new NotFoundException('Сесію трекінгу не знайдено');
        if (session.booking.ownerId !== userId) {
            throw new ForbiddenException('Тільки власник може встановити геозону');
        }
        return this.geoRepository.createGeofence(dto);
    }

    async getGeofenceBySession(sessionId: string): Promise<Geofence | null> {
        return this.geoRepository.findBySessionId(sessionId);
    }

    async deleteGeofence(id: string, userId: string): Promise<void> {
        const geofence = await this.geoRepository.findById(id);
        if (!geofence) throw new NotFoundException('Геозону не знайдено');
        await this.geoRepository.delete(id);
    }

    async checkGeofence(lat: number, lng: number, sessionId: string): Promise<boolean> {
        return this.geoRepository.isPointInsideGeofence(lat, lng, sessionId);
    }

    async getWalkStats(segmentId: string) {
        return this.geoRepository.getWalkStats(segmentId);
    }

    async getSessionStats(sessionId: string) {
        return this.geoRepository.getSessionStats(sessionId);
    }

    async getRouteGeoJSON(segmentId: string) {
        return this.geoRepository.getRouteGeoJSON(segmentId);
    }

    async getMaxDeviation(segmentId: string, geofenceId: string): Promise<{ maxDeviationMeters: number }> {
        const maxDeviationMeters = await this.geoRepository.getMaxDeviation(segmentId, geofenceId);
        return { maxDeviationMeters };
    }
}
