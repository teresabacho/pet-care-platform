import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { TrackingSession } from './entities/tracking-session.entity';
import { WalkSegment } from './entities/walk-segment.entity';
import { TrackPoint } from './entities/track-point.entity';
import { TrackingSessionStatus, WalkSegmentStatus } from '@pet-care/shared';

@Injectable()
export class TrackingRepository {
    constructor(
        @InjectRepository(TrackingSession)
        private readonly sessionRepo: Repository<TrackingSession>,
        @InjectRepository(WalkSegment)
        private readonly segmentRepo: Repository<WalkSegment>,
        @InjectRepository(TrackPoint)
        private readonly pointRepo: Repository<TrackPoint>,
        private readonly dataSource: DataSource,
    ) {}

    createSession(bookingId: string): Promise<TrackingSession> {
        return this.sessionRepo.save(
            this.sessionRepo.create({ bookingId, status: TrackingSessionStatus.ACTIVE }),
        );
    }

    findSessionByBookingId(bookingId: string): Promise<TrackingSession | null> {
        return this.sessionRepo.findOne({ where: { bookingId } });
    }

    findSessionById(id: string): Promise<TrackingSession | null> {
        return this.sessionRepo.findOne({ where: { id }, relations: ['booking'] });
    }

    createWalkSegment(sessionId: string): Promise<WalkSegment> {
        return this.segmentRepo.save(
            this.segmentRepo.create({
                sessionId,
                status: WalkSegmentStatus.ACTIVE,
                startedAt: new Date(),
            }),
        );
    }

    findActiveSegmentBySessionId(sessionId: string): Promise<WalkSegment | null> {
        return this.segmentRepo.findOne({
            where: { sessionId, status: WalkSegmentStatus.ACTIVE },
        });
    }

    findSegmentById(id: string): Promise<WalkSegment | null> {
        return this.segmentRepo.findOne({ where: { id } });
    }

    findSegmentsBySessionId(sessionId: string): Promise<WalkSegment[]> {
        return this.segmentRepo.find({ where: { sessionId }, order: { startedAt: 'ASC' } });
    }

    async updateSessionStatus(id: string, status: TrackingSessionStatus, endedAt?: Date): Promise<void> {
        await this.sessionRepo.update(id, { status, ...(endedAt && { endedAt }) });
    }

    async completeSegment(id: string, distanceMeters: number | null): Promise<void> {
        await this.segmentRepo.update(id, {
            status: WalkSegmentStatus.COMPLETED,
            endedAt: new Date(),
            distanceMeters,
        });
    }

    // Batch insert GPS points using raw SQL for PostGIS ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    async insertPoints(points: {
        sessionId: string;
        walkSegmentId: string | null;
        lat: number;
        lng: number;
        altitude: number | null;
        speed: number | null;
        timestamp: Date;
    }[]): Promise<void> {
        if (points.length === 0) return;

        const values = points.map((_, i) => {
            const base = i * 7;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, ST_SetSRID(ST_MakePoint($${base + 4}, $${base + 3}), 4326))`;
        }).join(', ');

        const params = points.flatMap(p => [
            p.sessionId, p.walkSegmentId, p.lat, p.lng,
            p.altitude, p.speed, p.timestamp,
        ]);

        await this.dataSource.query(
            `INSERT INTO track_points (session_id, walk_segment_id, latitude, longitude, altitude, speed, timestamp, geom) VALUES ${values}`,
            params,
        );
    }

    findPointsBySessionId(sessionId: string, segmentId?: string): Promise<TrackPoint[]> {
        const where: { sessionId: string; walkSegmentId?: string | null } = { sessionId };
        if (segmentId) {
            where.walkSegmentId = segmentId;
        }
        return this.pointRepo.find({ where, order: { timestamp: 'ASC' } });
    }

    // Compute walk distance via PostGIS — called when completing a segment
    async computeSegmentDistance(segmentId: string): Promise<number> {
        const result = await this.dataSource.query<[{ distance: string }]>(
            `SELECT ST_Length(ST_MakeLine(geom ORDER BY timestamp)::geography) AS distance
             FROM track_points
             WHERE walk_segment_id = $1`,
            [segmentId],
        );
        return parseFloat(result[0]?.distance ?? '0');
    }

    // Find all open (ACTIVE) segments — used in completeSession to close forgotten ones
    findActiveSegmentsBySessionId(sessionId: string): Promise<WalkSegment[]> {
        return this.segmentRepo.find({
            where: { sessionId, status: WalkSegmentStatus.ACTIVE },
        });
    }

    // Delete background points (walkSegmentId = NULL) older than ttlHours
    async deleteOldBackgroundPoints(ttlHours: number): Promise<void> {
        await this.dataSource.query(
            `DELETE FROM track_points
             WHERE walk_segment_id IS NULL
               AND timestamp < NOW() - make_interval(hours => $1)`,
            [ttlHours],
        );
    }
}
