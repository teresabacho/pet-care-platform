import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BookingStatus, ServiceType } from '@pet-care/shared';
import { User } from '../../auth/entities/user.entity';
import { Pet } from '../../pets/entities/pet.entity';

@Entity('bookings')
export class Booking {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'owner_id' })
    owner: User;

    @Column({ name: 'owner_id' })
    ownerId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'caretaker_id' })
    caretaker: User;

    @Column({ name: 'caretaker_id' })
    caretakerId: string;

    @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'pet_id' })
    pet: Pet;

    @Column({ name: 'pet_id' })
    petId: string;

    @Column({ type: 'enum', enum: ServiceType, name: 'service_type' })
    serviceType: ServiceType;

    @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
    status: BookingStatus;

    @Column({ type: 'timestamp', name: 'scheduled_start' })
    scheduledStart: Date;

    @Column({ type: 'timestamp', name: 'scheduled_end' })
    scheduledEnd: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'actual_start' })
    actualStart: Date | null;

    @Column({ type: 'timestamp', nullable: true, name: 'actual_end' })
    actualEnd: Date | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
