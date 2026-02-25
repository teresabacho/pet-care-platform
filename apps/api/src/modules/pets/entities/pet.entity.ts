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

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    weight: number | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ nullable: true, name: 'photo_url' })
    photoUrl: string | null;

    @Column({ type: 'text', nullable: true, name: 'special_needs' })
    specialNeeds: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
