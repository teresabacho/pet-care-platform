import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TrackingSession } from './tracking-session.entity';
import { WalkSegment } from './walk-segment.entity';

@Entity('track_points')
export class TrackPoint {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => TrackingSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session: TrackingSession;

    @Column({ name: 'session_id' })
    sessionId: string;

    // NULL = background point (pet at home between walks)
    // non-NULL = walk point (part of a WalkSegment route)
    @ManyToOne(() => WalkSegment, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'walk_segment_id' })
    walkSegment: WalkSegment | null;

    @Column({ name: 'walk_segment_id', nullable: true })
    walkSegmentId: string | null;

    @Column({ type: 'float' })
    latitude: number;

    @Column({ type: 'float' })
    longitude: number;

    @Column({ type: 'float', nullable: true })
    altitude: number | null;

    @Column({ type: 'float', nullable: true })
    speed: number | null;

    @Column({ type: 'timestamptz' })
    timestamp: Date;

    // PostGIS Point geometry — inserted via raw SQL ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    // Note: longitude FIRST in ST_MakePoint per PostGIS convention
    @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, select: false })
    geom: string;
}
