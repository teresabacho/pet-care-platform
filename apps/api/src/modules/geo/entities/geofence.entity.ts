import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TrackingSession } from '../../tracking/entities/tracking-session.entity';

@Entity('geofences')
export class Geofence {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => TrackingSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session: TrackingSession;

    @Column({ name: 'session_id' })
    sessionId: string;

    @Column({ name: 'center_lat', type: 'float' })
    centerLat: number;

    @Column({ name: 'center_lng', type: 'float' })
    centerLng: number;

    @Column({ name: 'radius_meters', type: 'float' })
    radiusMeters: number;

    // PostGIS Point for efficient spatial queries — inserted via raw SQL
    @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, select: false })
    geom: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
