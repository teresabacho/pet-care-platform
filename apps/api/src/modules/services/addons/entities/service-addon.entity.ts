import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { AddonPriceUnit } from '@pet-care/shared';
import { ServiceOffering } from '../../entities/service-offering.entity';

// Опціональна платна послуга, яку клієнт вибирає при створенні Booking-а
// (наприклад, «помити лапи після прогулянки»). Множник priceUnit вирішується
// при підрахунку ціни booking-а: PER_BOOKING ×1, PER_DAY ×days, PER_WALK ×walks.
@Entity('service_addons')
@Index('idx_service_addon_offering', ['serviceOfferingId'])
export class ServiceAddon {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ServiceOffering, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'service_offering_id' })
    serviceOffering: ServiceOffering;

    @Column({ type: 'uuid', name: 'service_offering_id' })
    serviceOfferingId: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'enum', enum: AddonPriceUnit, name: 'price_unit' })
    priceUnit: AddonPriceUnit;
}
