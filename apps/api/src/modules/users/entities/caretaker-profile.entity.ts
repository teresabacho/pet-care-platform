import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { CaretakerSkill, Language } from '@pet-care/shared';
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

    @Column({ type: 'text', array: true, default: '{}' })
    skills: CaretakerSkill[];

    // Мови спілкування caretaker-а. Зберігаються як ISO-коди (UK/EN/...).
    @Column({ type: 'text', array: true, default: '{}' })
    languages: Language[];

    // ── Календар доступності ───────────────────────────────────────────
    // Caretaker періодично оновлює дату «доступний до». Якщо лишилось
    // менше доби — UI підсвічує червоним; якщо вже минула — теж червоний
    // як «прострочено». availabilityUpdatedAt оновлюється сервером
    // кожного разу, коли змінюється availabilityFilledUntil.
    @Column({ type: 'date', nullable: true, name: 'availability_filled_until' })
    availabilityFilledUntil: Date | null;

    @Column({
        type: 'timestamp',
        nullable: true,
        name: 'availability_updated_at',
    })
    availabilityUpdatedAt: Date | null;

    // Якщо false — координати, повернуті в публічних API, обфускуються детермінованим
    // зміщенням 200–500м (див. GeoService.obfuscateLocation). Реальні координати
    // використовуються лише серверними геозапитами (ST_DWithin).
    @Column({ type: 'boolean', default: false, name: 'address_is_public' })
    addressIsPublic: boolean;

    @Column({ type: 'float', nullable: true, name: 'service_latitude' })
    serviceLatitude: number | null;

    @Column({ type: 'float', nullable: true, name: 'service_longitude' })
    serviceLongitude: number | null;

    @Column({ type: 'float', nullable: true, name: 'radius_km' })
    radiusKm: number | null;

    @Column({ type: 'boolean', default: false, name: 'is_verified' })
    isVerified: boolean;

    @Column({
        type: 'decimal',
        precision: 3,
        scale: 2,
        nullable: true,
        name: 'avg_rating',
    })
    avgRating: number | null;

    @Column({ type: 'int', default: 0, name: 'reviews_count' })
    reviewsCount: number;

    @Column({ type: 'varchar', length: 2, nullable: true })
    country: string | null;

    @Column({ nullable: true })
    city: string | null;

    @Column({ nullable: true })
    street: string | null;

    @Column({ nullable: true })
    apartment: string | null;

    @Column({ nullable: true })
    floor: string | null;

    @Column({ nullable: true })
    entrance: string | null;
}