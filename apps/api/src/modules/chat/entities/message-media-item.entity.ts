import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
} from 'typeorm';
import { Message } from './message.entity';
import { MediaItem } from '../../media/entities/media-item.entity';

// Junction-таблиця: повідомлення може містити кілька MediaItem-ів.
// Composite PK на (messageId, mediaItemId) — унікальна пара.
@Entity('message_media_items')
export class MessageMediaItem {
    @PrimaryColumn({ type: 'uuid', name: 'message_id' })
    messageId: string;

    @PrimaryColumn({ type: 'uuid', name: 'media_item_id' })
    mediaItemId: string;

    @ManyToOne(() => Message, (m) => m.mediaItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'message_id' })
    message: Message;

    @ManyToOne(() => MediaItem, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'media_item_id' })
    mediaItem: MediaItem;

    @Column({ type: 'int', default: 0, name: 'order_index' })
    orderIndex: number;
}
