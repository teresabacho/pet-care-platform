import { Injectable, NotFoundException } from '@nestjs/common';
import { AvailabilityRepository } from './availability.repository';
import { CaretakerAvailability } from './entities/caretaker-availability.entity';
import { UsersRepository } from '../users.repository';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@Injectable()
export class AvailabilityService {
    constructor(
        private readonly availabilityRepo: AvailabilityRepository,
        private readonly usersRepo: UsersRepository,
    ) {}

    async findByCaretakerProfileId(
        caretakerProfileId: string,
        from: string,
        to: string,
    ): Promise<CaretakerAvailability[]> {
        return this.availabilityRepo.findByProfileAndRange(
            caretakerProfileId,
            from,
            to,
        );
    }

    async setForCurrentUser(
        userId: string,
        dto: SetAvailabilityDto,
    ): Promise<CaretakerAvailability[]> {
        const profile = await this.usersRepo.findCaretakerProfileByUserId(userId);
        if (!profile) {
            throw new NotFoundException('Профіль виконавця не знайдено');
        }

        const dates = dto.days.map((d) => d.date);
        const rows = dto.days.flatMap((d) =>
            d.slots.map((slot) => ({
                caretakerProfileId: profile.id,
                date: d.date,
                slot,
            })),
        );

        await this.availabilityRepo.replaceForDates(profile.id, dates, rows);
        await this.usersRepo.touchAvailabilityUpdatedAt(profile.id);

        if (dates.length === 0) {
            return [];
        }
        const min = dates.reduce((a, b) => (a < b ? a : b));
        const max = dates.reduce((a, b) => (a > b ? a : b));
        return this.availabilityRepo.findByProfileAndRange(profile.id, min, max);
    }
}
