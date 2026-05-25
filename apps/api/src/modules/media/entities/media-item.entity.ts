import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import {
    MediaBucket,
    MediaItemStatus,
    MediaOwnerType,
    MediaType,
} from '@pet-care/shared';
import { User } from '../../auth/entities/user.entity';

@Entity('media_item')
@Index('idx_media_item_owner', ['ownerType', 'ownerId'])
@Index('idx_media_item_status', ['status'])
@Index('idx_media_item_storage_key', ['storageKey'], { unique: true })
export class MediaItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: MediaOwnerType, name: 'owner_type' })
    ownerType: MediaOwnerType;

    // Поліморфне посилання — без foreign key. Цілісність гарантує MediaService:
    // при створенні MediaItem перевіряється що ownerId справді існує і
    // currentUser має право заливати медіа цього типу.
    @Column({ type: 'uuid', name: 'owner_id' })
    ownerId: string;

    @Column({ type: 'enum', enum: MediaBucket })
    bucket: MediaBucket;

    @Column({ type: 'text', name: 'storage_key' })
    storageKey: string;

    @Column({ type: 'text' })
    url: string;

    @Column({ type: 'text', nullable: true, name: 'thumbnail_key' })
    thumbnailKey: string | null;

    @Column({ type: 'text', nullable: true, name: 'thumbnail_url' })
    thumbnailUrl: string | null;

    @Column({ type: 'enum', enum: MediaType, name: 'media_type' })
    mediaType: MediaType;

    @Column({ type: 'varchar', length: 100, name: 'mime_type' })
    mimeType: string;

    @Column({ type: 'bigint', name: 'size_bytes' })
    sizeBytes: number;

    @Column({ type: 'int', nullable: true })
    width: number | null;

    @Column({ type: 'int', nullable: true })
    height: number | null;

    @Column({ type: 'int', nullable: true, name: 'duration_seconds' })
    durationSeconds: number | null;

    @Column({
        type: 'enum',
        enum: MediaItemStatus,
        default: MediaItemStatus.PENDING,
    })
    status: MediaItemStatus;

    @Column({ type: 'int', default: 0, name: 'order_index' })
    orderIndex: number;

    @Column({ type: 'uuid', name: 'uploaded_by_id' })
    uploadedById: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'uploaded_by_id' })
    uploadedBy: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
