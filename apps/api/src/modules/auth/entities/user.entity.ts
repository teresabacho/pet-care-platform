import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '@pet-care/shared';
import { CaretakerProfile } from '../../users/entities/caretaker-profile.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ name: 'password_hash' })
    @Exclude()
    passwordHash: string;

    @Column({ nullable: true, name: 'refresh_token_hash' })
    @Exclude()
    refreshTokenHash: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.OWNER })
    role: UserRole;

    @Column({ nullable: true, name: 'first_name' })
    firstName: string;

    @Column({ nullable: true, name: 'last_name' })
    lastName: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true, name: 'avatar_url' })
    avatarUrl: string;

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

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToOne(() => CaretakerProfile, (profile) => profile.user)
    caretakerProfile: CaretakerProfile;
}