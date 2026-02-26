import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity('reviews')
export class Review {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => Booking, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'booking_id' })
    booking: Booking;

    @Column({ name: 'booking_id' })
    bookingId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'author_id' })
    author: User;

    @Column({ name: 'author_id' })
    authorId: string;

    // target — виконавець якого оцінюють
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'target_id' })
    target: User;

    @Column({ name: 'target_id' })
    targetId: string;

    @Column({ type: 'int' })
    rating: number;

    @Column({ type: 'text', nullable: true })
    title: string | null;

    @Column({ type: 'text', nullable: true })
    comment: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
