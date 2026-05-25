import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { MessageType } from '@pet-care/shared';
import { User } from '../../auth/entities/user.entity';
import { Conversation } from './conversation.entity';
import { MessageMediaItem } from './message-media-item.entity';

@Entity('messages')
@Index('idx_messages_conversation_created', ['conversationId', 'createdAt'])
@Index('idx_messages_sender_read', ['senderId', 'readAt'])
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;

    @Column({ type: 'uuid', name: 'conversation_id' })
    conversationId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sender_id' })
    sender: User;

    @Column({ type: 'uuid', name: 'sender_id' })
    senderId: string;

    @Column({
        type: 'enum',
        enum: MessageType,
        default: MessageType.TEXT,
        name: 'message_type',
    })
    messageType: MessageType;

    // Обов'язкове для TEXT, опціональне для MEDIA (як caption).
    @Column({ type: 'text', nullable: true })
    text: string | null;

    @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
    readAt: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @OneToMany(() => MessageMediaItem, (m) => m.message, { cascade: false })
    mediaItems: MessageMediaItem[];
}
