import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaItemStatus, MediaOwnerType } from '@pet-care/shared';
import { CertificatesRepository } from './certificates.repository';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { Certificate } from './entities/certificate.entity';
import { MediaService } from '../../media/media.service';
import { MediaRepository } from '../../media/media.repository';
import { UsersRepository } from '../users.repository';
import type { MediaLimitsConfig } from '../../../config/media-limits.config';

@Injectable()
export class CertificatesService {
    private readonly maxItems: number;

    constructor(
        private readonly certificatesRepo: CertificatesRepository,
        private readonly mediaService: MediaService,
        private readonly mediaRepo: MediaRepository,
        private readonly usersRepo: UsersRepository,
        private readonly configService: ConfigService,
    ) {
        const limits =
            this.configService.get<MediaLimitsConfig>('mediaLimits');
        if (!limits) throw new Error('mediaLimits config is not registered');
        this.maxItems = limits.maxCaretakerCertificates;
    }

    async create(userId: string, dto: CreateCertificateDto): Promise<Certificate> {
        const profile = await this.usersRepo.findCaretakerProfileByUserId(userId);
        if (!profile) {
            throw new NotFoundException('Профіль виконавця не знайдено');
        }

        const count = await this.certificatesRepo.countByCaretakerProfileId(profile.id);
        if (count >= this.maxItems) {
            throw new ConflictException(
                `Перевищено ліміт у ${this.maxItems} сертифікатів`,
            );
        }

        const mediaItem = await this.mediaRepo.findById(dto.mediaItemId);
        if (!mediaItem) {
            throw new NotFoundException('MediaItem не знайдено');
        }
        if (mediaItem.ownerType !== MediaOwnerType.CARETAKER_CERTIFICATE) {
            throw new BadRequestException(
                'MediaItem має бути типу CARETAKER_CERTIFICATE',
            );
        }
        if (mediaItem.ownerId !== profile.id) {
            throw new ForbiddenException(
                'MediaItem належить іншому caretaker-профілю',
            );
        }
        if (mediaItem.uploadedById !== userId) {
            throw new ForbiddenException('MediaItem завантажений не вами');
        }
        if (
            mediaItem.status !== MediaItemStatus.PENDING &&
            mediaItem.status !== MediaItemStatus.READY
        ) {
            throw new BadRequestException(
                `MediaItem у недопустимому статусі ${mediaItem.status}`,
            );
        }

        if (mediaItem.status === MediaItemStatus.PENDING) {
            await this.mediaService.confirmUpload(mediaItem.id, userId);
        }

        return this.certificatesRepo.create({
            caretakerProfileId: profile.id,
            type: dto.type,
            title: dto.title,
            mediaItemId: mediaItem.id,
        });
    }

    async findByCaretakerProfileId(caretakerProfileId: string): Promise<Certificate[]> {
        return this.certificatesRepo.findByCaretakerProfileId(caretakerProfileId);
    }

    async delete(id: string, userId: string): Promise<void> {
        const cert = await this.certificatesRepo.findById(id);
        if (!cert) {
            throw new NotFoundException('Сертифікат не знайдено');
        }
        const profile = await this.usersRepo.findCaretakerProfileByUserId(userId);
        if (!profile || profile.id !== cert.caretakerProfileId) {
            throw new ForbiddenException('Це не ваш сертифікат');
        }

        // Спершу видаляємо Certificate (інакше FK RESTRICT не дасть видалити MediaItem),
        // потім видаляємо файл і MediaItem-рядок.
        await this.certificatesRepo.delete(cert.id);
        await this.mediaService.delete(cert.mediaItemId, userId);
    }
}
