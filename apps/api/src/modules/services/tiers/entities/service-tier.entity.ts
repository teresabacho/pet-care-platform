import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { DayType, PriceUnit } from '@pet-care/shared';
import { ServiceOffering } from '../../entities/service-offering.entity';

// basePrice — ціна для тваринки розміру MEDIUM. Для інших розмірів додається
// SizeSurcharge.surchargeAmount (може бути від'ємним для дрібних). Обчислення
// фінальної ціни виконується при створенні Booking, див. step 5.5.11.
@Entity('service_tiers')
@Index('idx_service_tier_offering', ['serviceOfferingId'])
export class ServiceTier {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ServiceOffering, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'service_offering_id' })
    serviceOffering: ServiceOffering;

    @Column({ type: 'uuid', name: 'service_offering_id' })
    serviceOfferingId: string;

    // null для денних послуг (PER_DAY) — тривалість визначається датами booking-а.
    @Column({ type: 'int', nullable: true, name: 'duration_minutes' })
    durationMinutes: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'base_price' })
    basePrice: number;

    @Column({ type: 'enum', enum: PriceUnit, name: 'price_unit' })
    priceUnit: PriceUnit;

    // REGULAR — звичайний робочий день. WEEKEND/HOLIDAY — окремий тариф для
    // вихідних/свят. BookingPricingService автоматично обирає найбільш
    // специфічний tier для дати, не клієнт. Якщо немає WEEKEND/HOLIDAY —
    // fallback на REGULAR.
    @Column({
        type: 'enum',
        enum: DayType,
        default: DayType.REGULAR,
        name: 'day_type',
    })
    dayType: DayType;
}
