import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateCaretakerProfileDto } from './dto/create-caretaker-profile.dto';
import { UpdateCaretakerProfileDto } from './dto/update-caretaker-profile.dto';
import { GeoService } from '../geo/geo.service';

@Injectable()
export class UsersService {
    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly geoService: GeoService,
    ) {}

    async getPublicProfile(id: string, viewerId?: string) {
        const user = await this.usersRepository.findUserById(id);
        if (!user) {
            throw new NotFoundException('Користувача не знайдено');
        }

        const profile = user.caretakerProfile;
        const isOwner = viewerId !== undefined && viewerId === user.id;
        if (
            profile &&
            profile.addressIsPublic === false &&
            !isOwner &&
            profile.serviceLatitude !== null &&
            profile.serviceLongitude !== null
        ) {
            const obfuscated = this.geoService.obfuscateLocation(
                profile.serviceLatitude,
                profile.serviceLongitude,
                profile.id,
            );
            profile.serviceLatitude = obfuscated.latitude;
            profile.serviceLongitude = obfuscated.longitude;
        }

        return user;
    }

    updateUser(userId: string, dto: UpdateUserDto) {
        return this.usersRepository.updateUser(userId, dto);
    }

    setAvatarUrl(userId: string, url: string | null) {
        return this.usersRepository.setAvatarUrl(userId, url);
    }

    async createCaretakerProfile(userId: string, dto: CreateCaretakerProfileDto) {
        const existing = await this.usersRepository.findCaretakerProfileByUserId(userId);
        if (existing) {
            throw new ConflictException('Профіль виконавця вже існує');
        }
        return this.usersRepository.createCaretakerProfile(
            userId,
            this.withAvailabilityTimestamp(dto),
        );
    }

    async updateCaretakerProfile(userId: string, dto: UpdateCaretakerProfileDto) {
        const existing = await this.usersRepository.findCaretakerProfileByUserId(userId);
        if (!existing) {
            throw new NotFoundException('Профіль виконавця не знайдено');
        }
        return this.usersRepository.updateCaretakerProfile(
            userId,
            this.withAvailabilityTimestamp(dto),
        );
    }

    // Якщо клієнт оновлює "доступний до", сервер автоматично проставляє
    // момент оновлення — щоб UI показував "останнє оновлення DD.MM.YYYY".
    private withAvailabilityTimestamp<T extends { availabilityFilledUntil?: string }>(
        dto: T,
    ): T & { availabilityUpdatedAt?: Date } {
        if (dto.availabilityFilledUntil !== undefined) {
            return { ...dto, availabilityUpdatedAt: new Date() };
        }
        return dto;
    }
}
