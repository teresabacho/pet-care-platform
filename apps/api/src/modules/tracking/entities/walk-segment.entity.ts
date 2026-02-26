import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WalkSegmentStatus } from '@pet-care/shared';
import { TrackingSession } from './tracking-session.entity';

@Entity('walk_segments')
export class WalkSegment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => TrackingSession, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session: TrackingSession;

    @Column({ name: 'session_id' })
    sessionId: string;

    @Column({
        type: 'enum',
        enum: WalkSegmentStatus,
        default: WalkSegmentStatus.ACTIVE,
    })
    status: WalkSegmentStatus;

    @Column({ name: 'started_at', type: 'timestamptz' })
    startedAt: Date;

    @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
    endedAt: Date | null;

    // Computed via PostGIS ST_Length on segment completion
    @Column({ name: 'distance_meters', type: 'float', nullable: true })
    distanceMeters: number | null;
}
