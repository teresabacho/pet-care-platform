import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
    MediaItemStatus,
    MediaOwnerType,
} from '@pet-care/shared';
import { MediaItem } from './entities/media-item.entity';

@Injectable()
export class MediaRepository {
    constructor(
        @InjectRepository(MediaItem)
        private readonly repo: Repository<MediaItem>,
    ) {}

    findById(id: string): Promise<MediaItem | null> {
        return this.repo.findOne({ where: { id } });
    }

    findByStorageKey(storageKey: string): Promise<MediaItem | null> {
        return this.repo.findOne({ where: { storageKey } });
    }

    findReadyByOwner(
        ownerType: MediaOwnerType,
        ownerId: string,
    ): Promise<MediaItem[]> {
        return this.repo.find({
            where: { ownerType, ownerId, status: MediaItemStatus.READY },
            order: { orderIndex: 'ASC', createdAt: 'ASC' },
        });
    }

    countReady(ownerType: MediaOwnerType, ownerId: string): Promise<number> {
        return this.repo.count({
            where: { ownerType, ownerId, status: MediaItemStatus.READY },
        });
    }

    save(item: Partial<MediaItem>): Promise<MediaItem> {
        return this.repo.save(this.repo.create(item));
    }

    update(id: string, patch: Partial<MediaItem>): Promise<void> {
        return this.repo.update(id, patch).then(() => undefined);
    }

    hardDelete(id: string): Promise<void> {
        return this.repo.delete(id).then(() => undefined);
    }

    findStuckPending(olderThan: Date): Promise<MediaItem[]> {
        return this.repo.find({
            where: {
                status: MediaItemStatus.PENDING,
                createdAt: LessThan(olderThan),
            },
        });
    }

    findOldDeleted(olderThan: Date): Promise<MediaItem[]> {
        return this.repo.find({
            where: {
                status: MediaItemStatus.DELETED,
                createdAt: LessThan(olderThan),
            },
        });
    }
}
