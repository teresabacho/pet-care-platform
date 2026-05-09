import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceType } from '@pet-care/shared';
import { CaretakerProfile } from '../../users/entities/caretaker-profile.entity';

// Один caretaker має максимум один offering на ServiceType — редагування цін
// проводиться через зміну ServiceTier-ів, не створенням нового offering.
@Entity('service_offerings')
@Index('uq_service_offering_caretaker_type', ['caretakerId', 'serviceType'], { unique: true })
export class ServiceOffering {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => CaretakerProfile, { onDelete: 'CASCADE', eager: true })
    @JoinColumn({ name: 'caretaker_id' })
    caretaker: CaretakerProfile;

    @Column({ name: 'caretaker_id' })
    caretakerId: string;

    @Column({ type: 'enum', enum: ServiceType, name: 'service_type' })
    serviceType: ServiceType;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
