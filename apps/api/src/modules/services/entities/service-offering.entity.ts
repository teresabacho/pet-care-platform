import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PriceUnit, ServiceType } from '@pet-care/shared';
import { CaretakerProfile } from '../../users/entities/caretaker-profile.entity';

@Entity('service_offerings')
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

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    // Одиниця тарифікації: за сеанс, годину або добу
    @Column({ type: 'enum', enum: PriceUnit, default: PriceUnit.PER_SESSION, name: 'price_unit' })
    priceUnit: PriceUnit;

    // Тривалість одного сеансу в хвилинах (для WALKING, GROOMING, VET_VISIT)
    // Null для добових послуг (BOARDING, PET_SITTING)
    @Column({ type: 'int', nullable: true, name: 'duration_minutes' })
    durationMinutes: number | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
