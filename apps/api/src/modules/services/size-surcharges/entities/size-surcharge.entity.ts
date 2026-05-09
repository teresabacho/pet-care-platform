import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceOffering } from '../../entities/service-offering.entity';

// Дельта-надбавка до ServiceTier.basePrice залежно від виду та розміру тваринки.
// Для базового розміру (MEDIUM) surchargeAmount має дорівнювати 0 — це
// перевіряється сервісним валідатором при створенні offering.
// Дозволені значення size:
//   - якщо petSpecies = 'DOG' → DogSize (MINI/SMALL/MEDIUM/LARGE/EXTRA_LARGE)
//   - якщо petSpecies = 'CAT' → CatSize (SMALL/MEDIUM/LARGE)
@Entity('size_surcharges')
@Index('uq_size_surcharge', ['serviceOfferingId', 'petSpecies', 'size'], { unique: true })
export class SizeSurcharge {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ServiceOffering, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'service_offering_id' })
    serviceOffering: ServiceOffering;

    @Column({ type: 'uuid', name: 'service_offering_id' })
    serviceOfferingId: string;

    @Column({ type: 'varchar', length: 10, name: 'pet_species' })
    petSpecies: 'DOG' | 'CAT';

    @Column({ type: 'varchar', length: 20 })
    size: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'surcharge_amount' })
    surchargeAmount: number;
}
