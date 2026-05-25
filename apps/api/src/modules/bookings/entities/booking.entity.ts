import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BookingStatus, PaymentStatus, ServiceType } from '@pet-care/shared';
import { User } from '../../auth/entities/user.entity';
import { Pet } from '../../pets/entities/pet.entity';
import { ServiceTier } from '../../services/tiers/entities/service-tier.entity';

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

    // FK на ServiceTier з RESTRICT — caretaker не може видалити tier поки існують
    // букінги, які на нього посилаються. Знімок ціни вже зафіксовано в `price`.
    @ManyToOne(() => ServiceTier, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'tier_id' })
    tier: ServiceTier;

    @Column({ type: 'uuid', name: 'tier_id' })
    tierId: string;

    // Snapshot обраних addon-ів (UUID-и) — без FK, бо addons можуть бути видалені
    // з offering без впливу на існуючі букінги. Для відображення в історії.
    @Column({ type: 'text', array: true, default: '{}', name: 'addon_ids' })
    addonIds: string[];

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ name: 'handover_confirmed_by_owner', default: false })
    handoverConfirmedByOwner: boolean;

    @Column({ name: 'handover_confirmed_by_caretaker', default: false })
    handoverConfirmedByCaretaker: boolean;

    @Column({ name: 'return_confirmed_by_owner', default: false })
    returnConfirmedByOwner: boolean;

    @Column({ name: 'return_confirmed_by_caretaker', default: false })
    returnConfirmedByCaretaker: boolean;

    // ── Скасування ─────────────────────────────────────────────────────────
    @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
    cancellationReason: string | null;

    // Хто скасував — щоб у власника відображалось «доглядальник скасував» / «ви скасували».
    @Column({ type: 'uuid', nullable: true, name: 'cancelled_by_user_id' })
    cancelledByUserId: string | null;

    @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
    cancelledAt: Date | null;

    // ── Платежі (LiqPay test-mode) ─────────────────────────────────────────
    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.AWAITING_PAYMENT,
        name: 'payment_status',
    })
    paymentStatus: PaymentStatus;

    // LiqPay payment_id (number у відповіді — зберігаємо як string для гнучкості).
    @Column({ type: 'varchar', nullable: true, name: 'payment_external_id' })
    paymentExternalId: string | null;

    @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
    paidAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
