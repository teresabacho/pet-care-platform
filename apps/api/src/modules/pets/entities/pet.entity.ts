import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('pets')
export class Pet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'owner_id' })
    owner: User;

    @Column({ name: 'owner_id' })
    ownerId: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    species: string | null;

    @Column({ nullable: true })
    breed: string | null;

    @Column({ type: 'int', nullable: true })
    age: number | null;

    @Column({ type: 'int', nullable: true, name: 'age_months' })
    ageMonths: number | null;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    weight: number | null;

    @Column({ nullable: true })
    sex: string | null;

    // Розмір тваринки. Для собак — DogSize (MINI/SMALL/MEDIUM/LARGE/EXTRA_LARGE),
    // для котів — CatSize (SMALL/MEDIUM/LARGE). Використовується при підрахунку
    // ціни booking-а через SizeSurcharge. Null = трактуємо як MEDIUM (без надбавки).
    @Column({ nullable: true })
    size: string | null;

    @Column({ nullable: true })
    neutered: string | null;

    @Column({ type: 'date', nullable: true, name: 'date_acquired' })
    dateAcquired: string | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ nullable: true, name: 'photo_url' })
    photoUrl: string | null;

    @Column({ type: 'text', nullable: true, name: 'special_needs' })
    specialNeeds: string | null;

    @Column({ type: 'jsonb', nullable: true })
    details: Record<string, unknown> | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
