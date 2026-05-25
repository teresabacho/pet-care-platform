import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import {
    MediaBucket,
    MediaItemStatus,
    MediaOwnerType,
    MediaType,
} from '@pet-care/shared';
import { MediaItem } from './entities/media-item.entity';
import { MediaRepository } from './media.repository';
import { ImageProcessor } from './processors/image.processor';
import { StorageService } from '../storage/storage.service';
import type { S3BucketKind } from '../storage/interfaces/upload-result.interface';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { PetsService } from '../pets/pets.service';
import type { MediaLimitsConfig } from '../../config/media-limits.config';

const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/quicktime']);
const ALLOWED_IMAGE_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);
const ALLOWED_DOCUMENT_MIME = new Set(['application/pdf']);

interface UploadedFile {
    buffer: Buffer;
    mimetype: string;
    size: number;
    originalname: string;
}

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);
    private readonly limits: MediaLimitsConfig;

    constructor(
        private readonly mediaRepo: MediaRepository,
        private readonly storage: StorageService,
        private readonly imageProcessor: ImageProcessor,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly usersRepo: UsersRepository,
        private readonly petsService: PetsService,
    ) {
        const limits =
            this.configService.get<MediaLimitsConfig>('mediaLimits');
        if (!limits) throw new Error('mediaLimits config is not registered');
        this.limits = limits;
    }

    // ───────────────────────────── Proxy upload (images) ─────────────────────

    async uploadImage(
        file: UploadedFile,
        ownerType: MediaOwnerType,
        ownerId: string,
        currentUserId: string,
    ): Promise<MediaItem> {
        if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
            throw new BadRequestException(
                `Тип файлу ${file.mimetype} не підтримується для зображень`,
            );
        }

        await this.authorizeUpload(ownerType, ownerId, currentUserId);
        this.assertSize(ownerType, MediaType.IMAGE, file.size);
        await this.assertGalleryRoom(ownerType, ownerId);
        await this.imageProcessor.validateImage(file.buffer, file.mimetype);

        const isAvatar = this.isAvatarType(ownerType);
        const bucket = this.bucketFor(ownerType);
        const bucketKind: S3BucketKind =
            bucket === MediaBucket.PUBLIC ? 'PUBLIC' : 'PRIVATE';

        const baseKey = this.buildKey(ownerType, ownerId);
        const mainKey = `${baseKey}.webp`;
        let thumbKey: string | null = null;

        let mainBuffer: Buffer;
        let mainWidth: number;
        let mainHeight: number;
        let thumbBuffer: Buffer | null = null;
        let thumbWidth: number | null = null;
        let thumbHeight: number | null = null;

        if (isAvatar) {
            const out = await this.imageProcessor.processAvatar(file.buffer);
            mainBuffer = out.buffer;
            mainWidth = out.width;
            mainHeight = out.height;
        } else {
            const out =
                ownerType === MediaOwnerType.MESSAGE_MEDIA
                    ? await this.imageProcessor.processMessageImage(file.buffer)
                    : ownerType === MediaOwnerType.REVIEW_PHOTO
                      ? await this.imageProcessor.processReviewPhoto(file.buffer)
                      : await this.imageProcessor.processGalleryImage(
                            file.buffer,
                        );
            mainBuffer = out.main.buffer;
            mainWidth = out.main.width;
            mainHeight = out.main.height;
            thumbBuffer = out.thumbnail.buffer;
            thumbWidth = out.thumbnail.width;
            thumbHeight = out.thumbnail.height;
            thumbKey = `${baseKey}_thumb.webp`;
        }

        const mainUpload = await this.storage.uploadBuffer(
            bucketKind,
            mainKey,
            mainBuffer,
            'image/webp',
        );
        let thumbUrl: string | null = null;
        if (thumbBuffer && thumbKey) {
            const thumbUpload = await this.storage.uploadBuffer(
                bucketKind,
                thumbKey,
                thumbBuffer,
                'image/webp',
            );
            thumbUrl = thumbUpload.url;
        }

        const orderIndex = isAvatar
            ? 0
            : await this.mediaRepo.countReady(ownerType, ownerId);

        const item = await this.mediaRepo.save({
            ownerType,
            ownerId,
            bucket,
            storageKey: mainKey,
            url: mainUpload.url,
            thumbnailKey: thumbKey,
            thumbnailUrl: thumbUrl,
            mediaType: MediaType.IMAGE,
            mimeType: 'image/webp',
            sizeBytes: mainBuffer.length,
            width: mainWidth,
            height: mainHeight,
            durationSeconds: null,
            status: MediaItemStatus.READY,
            orderIndex,
            uploadedById: currentUserId,
        });

        if (isAvatar) {
            await this.replaceAvatar(ownerType, ownerId, item);
        }

        await this.stampPresignedIfPrivate(item);
        return item;
    }

    // Для приватного bucket-у `item.url` зберігається як `s3://...` (не URL).
    // Підставляємо короткоживучий presigned-GET у поля url/thumbnailUrl перед
    // відповіддю клієнту. БД не міняємо.
    private async stampPresignedIfPrivate(item: MediaItem): Promise<void> {
        if (item.bucket !== MediaBucket.PRIVATE) return;
        item.url = await this.storage.getPresignedDownloadUrl(
            'PRIVATE',
            item.storageKey,
        );
        if (item.thumbnailKey) {
            item.thumbnailUrl = await this.storage.getPresignedDownloadUrl(
                'PRIVATE',
                item.thumbnailKey,
            );
        }
    }

    // ───────────────────────────── Presigned upload (videos) ─────────────────

    async requestPresignedUpload(
        ownerType: MediaOwnerType,
        ownerId: string,
        mediaType: MediaType,
        mimeType: string,
        sizeBytes: number,
        currentUserId: string,
    ): Promise<{ mediaItem: MediaItem; uploadUrl: string }> {
        if (mediaType === MediaType.VIDEO) {
            if (!ALLOWED_VIDEO_MIME.has(mimeType)) {
                throw new BadRequestException(
                    `Тип ${mimeType} не підтримується для відео`,
                );
            }
        } else if (mediaType === MediaType.DOCUMENT) {
            if (ownerType !== MediaOwnerType.CARETAKER_CERTIFICATE) {
                throw new BadRequestException(
                    'Документи завантажуються лише для сертифікатів',
                );
            }
            if (!ALLOWED_DOCUMENT_MIME.has(mimeType)) {
                throw new BadRequestException(
                    `Тип ${mimeType} не підтримується для документів`,
                );
            }
        } else if (mediaType === MediaType.IMAGE) {
            if (ownerType !== MediaOwnerType.CARETAKER_CERTIFICATE) {
                throw new BadRequestException(
                    'Зображення завантажуються через POST /media/upload (proxy)',
                );
            }
            if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
                throw new BadRequestException(
                    `Тип ${mimeType} не підтримується для зображень`,
                );
            }
        } else {
            throw new BadRequestException('Невідомий mediaType');
        }

        await this.authorizeUpload(ownerType, ownerId, currentUserId);
        this.assertSize(ownerType, mediaType, sizeBytes);
        await this.assertGalleryRoom(ownerType, ownerId);

        const bucket = this.bucketFor(ownerType);
        const bucketKind: S3BucketKind =
            bucket === MediaBucket.PUBLIC ? 'PUBLIC' : 'PRIVATE';

        const ext = this.extensionFor(mediaType, mimeType);
        const key = `${this.buildKey(ownerType, ownerId)}.${ext}`;

        const item = await this.mediaRepo.save({
            ownerType,
            ownerId,
            bucket,
            storageKey: key,
            url:
                bucket === MediaBucket.PUBLIC
                    ? this.storage.publicUrl(key)
                    : `s3://${this.storage.resolveBucket(bucketKind)}/${key}`,
            thumbnailKey: null,
            thumbnailUrl: null,
            mediaType,
            mimeType,
            sizeBytes,
            width: null,
            height: null,
            durationSeconds: null,
            status: MediaItemStatus.PENDING,
            orderIndex: await this.mediaRepo.countReady(ownerType, ownerId),
            uploadedById: currentUserId,
        });

        const uploadUrl = await this.storage.getPresignedUploadUrl(
            bucketKind,
            key,
            mimeType,
        );

        return { mediaItem: item, uploadUrl };
    }

    async confirmUpload(
        mediaItemId: string,
        currentUserId: string,
    ): Promise<MediaItem> {
        const item = await this.mediaRepo.findById(mediaItemId);
        if (!item) throw new NotFoundException('MediaItem не знайдено');
        if (item.uploadedById !== currentUserId) {
            throw new ForbiddenException('Не ваш файл');
        }
        if (item.status !== MediaItemStatus.PENDING) {
            throw new ConflictException(
                `Не можна підтвердити файл у статусі ${item.status}`,
            );
        }

        const bucketKind: S3BucketKind =
            item.bucket === MediaBucket.PUBLIC ? 'PUBLIC' : 'PRIVATE';

        const exists = await this.storage.objectExists(
            bucketKind,
            item.storageKey,
        );
        if (!exists) {
            throw new BadRequestException('Файл не знайдено в сховищі');
        }

        const realSize = await this.storage.headObjectSize(
            bucketKind,
            item.storageKey,
        );

        await this.mediaRepo.update(item.id, {
            status: MediaItemStatus.READY,
            sizeBytes: realSize ?? item.sizeBytes,
        });

        const refreshed = (await this.mediaRepo.findById(item.id)) as MediaItem;
        await this.stampPresignedIfPrivate(refreshed);
        return refreshed;
    }

    // ───────────────────────────── Read presigned (private) ──────────────────

    async getPresignedDownloadUrl(
        mediaItemId: string,
        currentUserId: string,
    ): Promise<{ url: string; expiresAt: string }> {
        const item = await this.mediaRepo.findById(mediaItemId);
        if (!item) throw new NotFoundException('MediaItem не знайдено');
        if (item.bucket === MediaBucket.PUBLIC) {
            throw new BadRequestException(
                'Файл у публічному bucket — використовуйте url напряму',
            );
        }
        await this.authorizePrivateRead(item, currentUserId);

        const url = await this.storage.getPresignedDownloadUrl(
            'PRIVATE',
            item.storageKey,
        );
        const ttlSec = Number(
            this.configService.get('s3.presignedDownloadTtlSeconds') ?? 3600,
        );
        const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
        return { url, expiresAt };
    }

    // Внутрішній: коли інший модуль (ChatService) сам перевіряє доступ і
    // потребує лише short-lived URL для приватного файлу.
    async mintPresignedUrlForKey(
        storageKey: string,
    ): Promise<string> {
        return this.storage.getPresignedDownloadUrl('PRIVATE', storageKey);
    }

    // ───────────────────────────── Delete ────────────────────────────────────

    async delete(mediaItemId: string, currentUserId: string): Promise<void> {
        const item = await this.mediaRepo.findById(mediaItemId);
        if (!item) throw new NotFoundException('MediaItem не знайдено');
        if (item.uploadedById !== currentUserId) {
            await this.authorizeOwnerDelete(item, currentUserId);
        }
        await this.softDeleteAndRemoveFiles(item);

        if (this.isAvatarType(item.ownerType)) {
            await this.clearAvatarReference(item.ownerType, item.ownerId, item);
        }
    }

    async listForOwner(
        ownerType: MediaOwnerType,
        ownerId: string,
    ): Promise<MediaItem[]> {
        return this.mediaRepo.findReadyByOwner(ownerType, ownerId);
    }

    async reorder(
        ownerType: MediaOwnerType,
        ownerId: string,
        ids: string[],
        currentUserId: string,
    ): Promise<MediaItem[]> {
        if (
            ownerType === MediaOwnerType.PET_GALLERY ||
            ownerType === MediaOwnerType.PET_AVATAR
        ) {
            const pet = await this.petsService.getOne(ownerId);
            if (pet.ownerId !== currentUserId) {
                throw new ForbiddenException('Це не ваша тварина');
            }
        } else if (ownerType === MediaOwnerType.CARETAKER_GALLERY) {
            const profile =
                await this.usersRepo.findCaretakerProfileByUserId(
                    currentUserId,
                );
            if (!profile || profile.id !== ownerId) {
                throw new ForbiddenException('Це не ваш caretaker-профіль');
            }
        } else {
            throw new BadRequestException(
                'Reorder підтримується лише для галерей та аватарів',
            );
        }

        const existing = await this.mediaRepo.findReadyByOwner(
            ownerType,
            ownerId,
        );
        const existingIds = new Set(existing.map((i) => i.id));
        for (const id of ids) {
            if (!existingIds.has(id)) {
                throw new BadRequestException(
                    `MediaItem ${id} не належить цій сутності`,
                );
            }
        }

        for (let i = 0; i < ids.length; i++) {
            await this.mediaRepo.update(ids[i], { orderIndex: i });
        }

        return this.mediaRepo.findReadyByOwner(ownerType, ownerId);
    }

    async deleteCurrentAvatar(
        ownerType: MediaOwnerType.USER_AVATAR | MediaOwnerType.PET_AVATAR,
        ownerId: string,
        currentUserId: string,
    ): Promise<void> {
        if (ownerType === MediaOwnerType.USER_AVATAR) {
            if (ownerId !== currentUserId) {
                throw new ForbiddenException(
                    'Можна видалити лише власний аватар',
                );
            }
        } else {
            const pet = await this.petsService.getOne(ownerId);
            if (pet.ownerId !== currentUserId) {
                throw new ForbiddenException('Це не ваша тварина');
            }
        }

        const items = await this.mediaRepo.findReadyByOwner(
            ownerType,
            ownerId,
        );
        if (items.length === 0) {
            throw new NotFoundException('Аватара немає');
        }
        for (const item of items) {
            await this.softDeleteAndRemoveFiles(item);
        }
        await this.clearAvatarReference(ownerType, ownerId, items[0]);
    }

    async deleteAllByOwner(
        ownerType: MediaOwnerType,
        ownerId: string,
    ): Promise<void> {
        const items = await this.mediaRepo.findReadyByOwner(
            ownerType,
            ownerId,
        );
        for (const item of items) {
            await this.softDeleteAndRemoveFiles(item);
        }
    }

    // ───────────────────────────── Cron reconciliation ───────────────────────

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async reconcileStorage(): Promise<void> {
        this.logger.log('Media reconciliation cron started');

        const stuck = await this.mediaRepo.findStuckPending(
            new Date(Date.now() - 60 * 60 * 1000),
        );
        for (const item of stuck) {
            const kind: S3BucketKind =
                item.bucket === MediaBucket.PUBLIC ? 'PUBLIC' : 'PRIVATE';
            const exists = await this.storage.objectExists(
                kind,
                item.storageKey,
            );
            if (exists) {
                const size = await this.storage.headObjectSize(
                    kind,
                    item.storageKey,
                );
                await this.mediaRepo.update(item.id, {
                    status: MediaItemStatus.READY,
                    sizeBytes: size ?? item.sizeBytes,
                });
                this.logger.log(
                    `Reconciled stuck PENDING ${item.id} → READY`,
                );
            } else {
                await this.mediaRepo.update(item.id, {
                    status: MediaItemStatus.EXPIRED,
                });
                await this.mediaRepo.hardDelete(item.id);
                this.logger.log(
                    `Removed expired PENDING ${item.id} (no object in storage)`,
                );
            }
        }

        const oldDeleted = await this.mediaRepo.findOldDeleted(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        );
        for (const item of oldDeleted) {
            await this.mediaRepo.hardDelete(item.id);
        }
        if (oldDeleted.length) {
            this.logger.log(
                `Hard-deleted ${oldDeleted.length} old DELETED rows`,
            );
        }

        for (const kind of ['PUBLIC', 'PRIVATE'] as S3BucketKind[]) {
            let orphans = 0;
            for await (const key of this.storage.listAllKeys(kind)) {
                const known = await this.mediaRepo.findByStorageKey(key);
                if (!known) {
                    await this.storage.deleteObject(kind, key);
                    orphans += 1;
                }
            }
            if (orphans) {
                this.logger.log(
                    `Removed ${orphans} orphan keys from ${kind} bucket`,
                );
            }
        }

        this.logger.log('Media reconciliation cron finished');
    }

    // ───────────────────────────── Event listeners ───────────────────────────

    @OnEvent('pet.deleted')
    async onPetDeleted(payload: { petId: string }): Promise<void> {
        await this.deleteAllByOwner(MediaOwnerType.PET_AVATAR, payload.petId);
        await this.deleteAllByOwner(MediaOwnerType.PET_GALLERY, payload.petId);
    }

    @OnEvent('user.deleted')
    async onUserDeleted(payload: { userId: string }): Promise<void> {
        await this.deleteAllByOwner(
            MediaOwnerType.USER_AVATAR,
            payload.userId,
        );
    }

    // ───────────────────────────── Helpers ───────────────────────────────────

    private isAvatarType(t: MediaOwnerType): boolean {
        return (
            t === MediaOwnerType.USER_AVATAR ||
            t === MediaOwnerType.PET_AVATAR
        );
    }

    private bucketFor(t: MediaOwnerType): MediaBucket {
        return t === MediaOwnerType.MESSAGE_MEDIA
            ? MediaBucket.PRIVATE
            : MediaBucket.PUBLIC;
    }

    private buildKey(ownerType: MediaOwnerType, ownerId: string): string {
        const id = randomUUID();
        switch (ownerType) {
            case MediaOwnerType.USER_AVATAR:
                return `avatars/users/${ownerId}/${id}`;
            case MediaOwnerType.PET_AVATAR:
                return `avatars/pets/${ownerId}/${id}`;
            case MediaOwnerType.CARETAKER_GALLERY:
                return `galleries/caretakers/${ownerId}/${id}`;
            case MediaOwnerType.PET_GALLERY:
                return `galleries/pets/${ownerId}/${id}`;
            case MediaOwnerType.REVIEW_PHOTO:
                return `reviews/${ownerId}/${id}`;
            case MediaOwnerType.MESSAGE_MEDIA:
                return `messages/${ownerId}/${id}`;
            case MediaOwnerType.CARETAKER_CERTIFICATE:
                return `certificates/${ownerId}/${id}`;
        }
    }

    private extensionFor(mediaType: MediaType, mimeType: string): string {
        if (mediaType === MediaType.VIDEO) {
            return mimeType === 'video/mp4' ? 'mp4' : 'mov';
        }
        if (mediaType === MediaType.DOCUMENT) {
            return 'pdf';
        }
        // IMAGE — без обробки sharp у presigned-flow, зберігаємо оригінальне розширення
        if (mimeType === 'image/jpeg') return 'jpg';
        if (mimeType === 'image/png') return 'png';
        return 'webp';
    }

    private async authorizeUpload(
        ownerType: MediaOwnerType,
        ownerId: string,
        currentUserId: string,
    ): Promise<void> {
        switch (ownerType) {
            case MediaOwnerType.USER_AVATAR: {
                if (ownerId !== currentUserId) {
                    throw new ForbiddenException(
                        'Можна змінювати лише власний аватар',
                    );
                }
                return;
            }
            case MediaOwnerType.PET_AVATAR:
            case MediaOwnerType.PET_GALLERY: {
                const pet = await this.petsService.getOne(ownerId);
                if (pet.ownerId !== currentUserId) {
                    throw new ForbiddenException('Це не ваша тварина');
                }
                return;
            }
            case MediaOwnerType.CARETAKER_GALLERY:
            case MediaOwnerType.CARETAKER_CERTIFICATE: {
                const profile =
                    await this.usersRepo.findCaretakerProfileByUserId(
                        currentUserId,
                    );
                if (!profile || profile.id !== ownerId) {
                    throw new ForbiddenException(
                        'Це не ваш caretaker-профіль',
                    );
                }
                return;
            }
            case MediaOwnerType.REVIEW_PHOTO: {
                // Спрощена перевірка для MVP — повна логіка (review.authorId,
                // booking.status === COMPLETED) додасться разом з ReviewsService.
                return;
            }
            case MediaOwnerType.MESSAGE_MEDIA: {
                // ownerId == userId — медіа «належить» завантажувачу як чернетка
                // до прикріплення повідомлення (junction message_media_items).
                if (ownerId !== currentUserId) {
                    throw new ForbiddenException(
                        'Завантажувати медіа повідомлень можна лише від свого імені',
                    );
                }
                return;
            }
        }
    }

    private async authorizePrivateRead(
        item: MediaItem,
        currentUserId: string,
    ): Promise<void> {
        if (item.ownerType === MediaOwnerType.MESSAGE_MEDIA) {
            // Перевірку учасництва в conversation додамо разом з ChatModule.
            // На MVP дозволяємо лише завантажувачу.
            if (item.uploadedById !== currentUserId) {
                throw new ForbiddenException(
                    'Доступ до приватного файлу обмежений',
                );
            }
            return;
        }
        throw new ForbiddenException('Файл не доступний');
    }

    private async authorizeOwnerDelete(
        item: MediaItem,
        currentUserId: string,
    ): Promise<void> {
        switch (item.ownerType) {
            case MediaOwnerType.USER_AVATAR: {
                if (item.ownerId !== currentUserId) {
                    throw new ForbiddenException();
                }
                return;
            }
            case MediaOwnerType.PET_AVATAR:
            case MediaOwnerType.PET_GALLERY: {
                const pet = await this.petsService.getOne(item.ownerId);
                if (pet.ownerId !== currentUserId) {
                    throw new ForbiddenException();
                }
                return;
            }
            case MediaOwnerType.CARETAKER_GALLERY:
            case MediaOwnerType.CARETAKER_CERTIFICATE: {
                const profile =
                    await this.usersRepo.findCaretakerProfileByUserId(
                        currentUserId,
                    );
                if (!profile || profile.id !== item.ownerId) {
                    throw new ForbiddenException();
                }
                return;
            }
            default:
                throw new ForbiddenException();
        }
    }

    private assertSize(
        ownerType: MediaOwnerType,
        mediaType: MediaType,
        size: number,
    ): void {
        const max = this.maxBytesFor(ownerType, mediaType);
        if (size > max) {
            throw new PayloadTooLargeException(
                `Файл перевищує ліміт ${max} байт`,
            );
        }
    }

    private maxBytesFor(
        ownerType: MediaOwnerType,
        mediaType: MediaType,
    ): number {
        if (
            ownerType === MediaOwnerType.USER_AVATAR ||
            ownerType === MediaOwnerType.PET_AVATAR
        ) {
            return this.limits.maxAvatarBytes;
        }
        if (ownerType === MediaOwnerType.REVIEW_PHOTO) {
            return this.limits.maxReviewImageBytes;
        }
        if (ownerType === MediaOwnerType.MESSAGE_MEDIA) {
            return mediaType === MediaType.VIDEO
                ? this.limits.maxMessageVideoBytes
                : this.limits.maxMessageImageBytes;
        }
        if (ownerType === MediaOwnerType.CARETAKER_CERTIFICATE) {
            return this.limits.maxCertificateBytes;
        }
        // CARETAKER_GALLERY / PET_GALLERY
        return mediaType === MediaType.VIDEO
            ? this.limits.maxGalleryVideoBytes
            : this.limits.maxGalleryImageBytes;
    }

    private async assertGalleryRoom(
        ownerType: MediaOwnerType,
        ownerId: string,
    ): Promise<void> {
        const max = this.maxItemsFor(ownerType);
        if (max === Infinity) return;
        const count = await this.mediaRepo.countReady(ownerType, ownerId);
        if (count >= max) {
            throw new ConflictException(
                `Перевищено ліміт у ${max} елементів для ${ownerType}`,
            );
        }
    }

    private maxItemsFor(ownerType: MediaOwnerType): number {
        switch (ownerType) {
            case MediaOwnerType.CARETAKER_GALLERY:
                return this.limits.maxCaretakerGalleryItems;
            case MediaOwnerType.PET_GALLERY:
                return this.limits.maxPetGalleryItems;
            case MediaOwnerType.REVIEW_PHOTO:
                return this.limits.maxReviewPhotos;
            case MediaOwnerType.CARETAKER_CERTIFICATE:
                return this.limits.maxCaretakerCertificates;
            default:
                return Infinity;
        }
    }

    private async replaceAvatar(
        ownerType: MediaOwnerType,
        ownerId: string,
        newItem: MediaItem,
    ): Promise<void> {
        const existing = await this.mediaRepo.findReadyByOwner(
            ownerType,
            ownerId,
        );
        for (const old of existing) {
            if (old.id === newItem.id) continue;
            await this.softDeleteAndRemoveFiles(old);
        }

        if (ownerType === MediaOwnerType.USER_AVATAR) {
            await this.usersService.setAvatarUrl(ownerId, newItem.url);
        } else {
            await this.petsService.setPhotoUrl(ownerId, newItem.url);
        }
    }

    private async clearAvatarReference(
        ownerType: MediaOwnerType,
        ownerId: string,
        deleted: MediaItem,
    ): Promise<void> {
        if (ownerType === MediaOwnerType.USER_AVATAR) {
            await this.usersService.setAvatarUrl(ownerId, null);
        } else if (ownerType === MediaOwnerType.PET_AVATAR) {
            await this.petsService.setPhotoUrl(ownerId, null);
        }
        // (deleted) тут потрібен лише для майбутньої логіки порівняння URL.
        void deleted;
    }

    private async softDeleteAndRemoveFiles(item: MediaItem): Promise<void> {
        const kind: S3BucketKind =
            item.bucket === MediaBucket.PUBLIC ? 'PUBLIC' : 'PRIVATE';
        await this.storage.deleteObject(kind, item.storageKey);
        if (item.thumbnailKey) {
            await this.storage.deleteObject(kind, item.thumbnailKey);
        }
        await this.mediaRepo.update(item.id, {
            status: MediaItemStatus.DELETED,
        });
    }
}
