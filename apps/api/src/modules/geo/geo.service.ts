import { createHash } from 'crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeoRepository } from './geo.repository';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { Geofence } from './entities/geofence.entity';
import { TrackingSession } from '../tracking/entities/tracking-session.entity';

const OBFUSCATION_MIN_METERS = 200;
const OBFUSCATION_MAX_METERS = 500;
const METERS_PER_DEGREE_LAT = 111320;

@Injectable()
export class GeoService {
    constructor(
        private readonly geoRepository: GeoRepository,
        @InjectRepository(TrackingSession)
        private readonly sessionRepo: Repository<TrackingSession>,
    ) {}

    // Детермінований обфускований offset 200–500м для приватної адреси доглядальника.
    // Той самий seed (caretakerProfileId) → той самий результат, щоб маркер не «стрибав»
    // між запитами. Реальні координати все ще використовуються серверним ST_DWithin.
    obfuscateLocation(lat: number, lng: number, seed: string): { latitude: number; longitude: number } {
        const hash = createHash('sha256').update(seed).digest();
        const angle = (hash.readUInt32BE(0) / 0xffffffff) * 2 * Math.PI;
        const distanceMeters =
            OBFUSCATION_MIN_METERS +
            (hash.readUInt32BE(4) / 0xffffffff) * (OBFUSCATION_MAX_METERS - OBFUSCATION_MIN_METERS);

        const latRad = (lat * Math.PI) / 180;
        const dLat = (distanceMeters * Math.cos(angle)) / METERS_PER_DEGREE_LAT;
        const dLng =
            (distanceMeters * Math.sin(angle)) / (METERS_PER_DEGREE_LAT * Math.cos(latRad));

        return {
            latitude: lat + dLat,
            longitude: lng + dLng,
        };
    }

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
