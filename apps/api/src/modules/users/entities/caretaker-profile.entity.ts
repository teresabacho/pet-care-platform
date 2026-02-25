import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('caretaker_profiles')
export class CaretakerProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ type: 'text', nullable: true })
    bio: string | null;

    @Column({ type: 'int', nullable: true, name: 'experience_years' })
    experienceYears: number | null;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        nullable: true,
        name: 'hourly_rate',
    })
    hourlyRate: number | null;

    @Column({ type: 'text', array: true, nullable: true, name: 'service_types' })
    serviceTypes: string[] | null;

    @Column({ type: 'float', nullable: true, name: 'service_latitude' })
    serviceLatitude: number | null;

    @Column({ type: 'float', nullable: true, name: 'service_longitude' })
    serviceLongitude: number | null;

    @Column({ type: 'float', nullable: true, name: 'radius_km' })
    radiusKm: number | null;

    @Column({ type: 'boolean', default: false, name: 'is_verified' })
    isVerified: boolean;
}