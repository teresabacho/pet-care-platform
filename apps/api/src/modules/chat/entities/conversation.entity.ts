import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

// Розмова 1-на-1. Нормалізуємо учасників як впорядковану пару:
// participantAId < participantBId (за лексикографією UUID).
// Це гарантує що пошук «розмова між X та Y» дає той самий ID
// незалежно від порядку аргументів — і unique constraint реально захищає від дублікатів.
@Entity('conversations')
@Unique('uq_conversation_participants', ['participantAId', 'participantBId'])
@Check('"participant_a_id" < "participant_b_id"')
@Index('idx_conversation_participant_a', ['participantAId'])
@Index('idx_conversation_participant_b', ['participantBId'])
export class Conversation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'participant_a_id' })
    participantA: User;

    @Column({ type: 'uuid', name: 'participant_a_id' })
    participantAId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'participant_b_id' })
    participantB: User;

    @Column({ type: 'uuid', name: 'participant_b_id' })
    participantBId: string;

    // Оновлюється при кожному новому повідомленні — для сортування списку розмов.
    @Column({ type: 'timestamptz', nullable: true, name: 'last_message_at' })
    lastMessageAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
