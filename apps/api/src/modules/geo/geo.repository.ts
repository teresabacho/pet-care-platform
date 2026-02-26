import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Geofence } from './entities/geofence.entity';
import { CreateGeofenceDto } from './dto/create-geofence.dto';

@Injectable()
export class GeoRepository {
    constructor(
        @InjectRepository(Geofence)
        private readonly geofenceRepo: Repository<Geofence>,
        private readonly dataSource: DataSource,
    ) {}

    async createGeofence(dto: CreateGeofenceDto): Promise<Geofence> {
        const result = await this.dataSource.query<[{ id: string }]>(
            `INSERT INTO geofences (session_id, center_lat, center_lng, radius_meters, geom)
             VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($3, $2), 4326))
             RETURNING id`,
            [dto.sessionId, dto.centerLat, dto.centerLng, dto.radiusMeters],
        );
        return this.geofenceRepo.findOne({ where: { id: result[0].id } }) as Promise<Geofence>;
    }

    findBySessionId(sessionId: string): Promise<Geofence | null> {
        return this.geofenceRepo.findOne({ where: { sessionId } });
    }

    findById(id: string): Promise<Geofence | null> {
        return this.geofenceRepo.findOne({ where: { id } });
    }

    async delete(id: string): Promise<void> {
        await this.geofenceRepo.delete(id);
    }

    // Check if a point is within the geofence boundary
    async isPointInsideGeofence(lat: number, lng: number, sessionId: string): Promise<boolean> {
        const result = await this.dataSource.query<[{ inside: boolean }]>(
            `SELECT ST_DWithin(
                g.geom::geography,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                g.radius_meters
             ) AS inside
             FROM geofences g
             WHERE g.session_id = $3
             LIMIT 1`,
            [lat, lng, sessionId],
        );
        return result[0]?.inside ?? true;
    }

    // Walk route distance using PostGIS
    async getWalkDistance(segmentId: string): Promise<number> {
        const result = await this.dataSource.query<[{ distance: string }]>(
            `SELECT ST_Length(ST_MakeLine(geom ORDER BY timestamp)::geography) AS distance
             FROM track_points WHERE walk_segment_id = $1`,
            [segmentId],
        );
        return parseFloat(result[0]?.distance ?? '0');
    }

    // Walk stats: distance, duration, avg/max speed, point count
    async getWalkStats(segmentId: string): Promise<{
        distanceMeters: number;
        durationSeconds: number;
        avgSpeedMs: number;
        maxSpeedMs: number;
        pointCount: number;
    }> {
        const result = await this.dataSource.query<[{
            distance: string;
            duration: string;
            avg_speed: string;
            max_speed: string;
            point_count: string;
        }]>(
            `SELECT
                ST_Length(ST_MakeLine(geom ORDER BY timestamp)::geography) AS distance,
                EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) AS duration,
                AVG(speed) AS avg_speed,
                MAX(speed) AS max_speed,
                COUNT(*) AS point_count
             FROM track_points
             WHERE walk_segment_id = $1`,
            [segmentId],
        );
        const row = result[0];
        return {
            distanceMeters: parseFloat(row.distance ?? '0'),
            durationSeconds: parseFloat(row.duration ?? '0'),
            avgSpeedMs: parseFloat(row.avg_speed ?? '0'),
            maxSpeedMs: parseFloat(row.max_speed ?? '0'),
            pointCount: parseInt(row.point_count ?? '0', 10),
        };
    }

    // Route as GeoJSON for Leaflet rendering
    async getRouteGeoJSON(segmentId: string): Promise<unknown> {
        const result = await this.dataSource.query<[{ geojson: string }]>(
            `SELECT ST_AsGeoJSON(ST_MakeLine(geom ORDER BY timestamp)) AS geojson
             FROM track_points WHERE walk_segment_id = $1`,
            [segmentId],
        );
        return JSON.parse(result[0]?.geojson ?? 'null');
    }

    // Maximum distance any GPS point deviated from the geofence center
    async getMaxDeviation(segmentId: string, geofenceId: string): Promise<number> {
        const result = await this.dataSource.query<[{ max_deviation: string }]>(
            `SELECT MAX(ST_Distance(tp.geom::geography, gf.geom::geography)) AS max_deviation
             FROM track_points tp, geofences gf
             WHERE tp.walk_segment_id = $1 AND gf.id = $2`,
            [segmentId, geofenceId],
        );
        return parseFloat(result[0]?.max_deviation ?? '0');
    }

    // Session-level stats (aggregate across all segments)
    async getSessionStats(sessionId: string): Promise<{
        walkCount: number;
        totalDistanceMeters: number;
        totalDurationSeconds: number;
    }> {
        const result = await this.dataSource.query<[{
            walk_count: string;
            total_distance: string;
            total_duration: string;
        }]>(
            `SELECT
                COUNT(*) AS walk_count,
                COALESCE(SUM(distance_meters), 0) AS total_distance,
                COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))), 0) AS total_duration
             FROM walk_segments
             WHERE session_id = $1 AND status = 'COMPLETED'`,
            [sessionId],
        );
        const row = result[0];
        return {
            walkCount: parseInt(row.walk_count ?? '0', 10),
            totalDistanceMeters: parseFloat(row.total_distance ?? '0'),
            totalDurationSeconds: parseFloat(row.total_duration ?? '0'),
        };
    }
}
