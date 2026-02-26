import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TrackingSessionStatus } from '@pet-care/shared';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity('tracking_sessions')
export class TrackingSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => Booking, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'booking_id' })
    booking: Booking;

    @Column({ name: 'booking_id' })
    bookingId: string;

    @Column({
        type: 'enum',
        enum: TrackingSessionStatus,
        default: TrackingSessionStatus.ACTIVE,
    })
    status: TrackingSessionStatus;

    @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
    startedAt: Date;

    @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
    endedAt: Date | null;
}
