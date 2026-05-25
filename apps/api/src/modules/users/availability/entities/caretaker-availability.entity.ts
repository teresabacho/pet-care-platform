import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { AvailabilitySlot } from '@pet-care/shared';
import { CaretakerProfile } from '../../entities/caretaker-profile.entity';

// Один рядок = один вільний слот caretaker-а у конкретний день.
// Відсутність рядка означає "зайнято/недоступно".
@Entity('caretaker_availability')
@Unique('uq_caretaker_availability_slot', ['caretakerProfileId', 'date', 'slot'])
@Index('idx_caretaker_availability_profile_date', ['caretakerProfileId', 'date'])
export class CaretakerAvailability {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => CaretakerProfile, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'caretaker_profile_id' })
    caretakerProfile: CaretakerProfile;

    @Column({ type: 'uuid', name: 'caretaker_profile_id' })
    caretakerProfileId: string;

    // Зберігаємо як date (без часу) — слот сам визначає інтервал годин.
    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'enum', enum: AvailabilitySlot })
    slot: AvailabilitySlot;
}
