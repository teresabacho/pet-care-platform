import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { CaretakerAvailability } from './entities/caretaker-availability.entity';

@Injectable()
export class AvailabilityRepository {
    constructor(
        @InjectRepository(CaretakerAvailability)
        private readonly repo: Repository<CaretakerAvailability>,
    ) {}

    findByProfileAndRange(
        caretakerProfileId: string,
        from: string,
        to: string,
    ): Promise<CaretakerAvailability[]> {
        return this.repo.find({
            where: {
                caretakerProfileId,
                date: Between(from, to),
            },
            order: { date: 'ASC' },
        });
    }

    async replaceForDates(
        caretakerProfileId: string,
        dates: string[],
        rows: Array<Pick<CaretakerAvailability, 'caretakerProfileId' | 'date' | 'slot'>>,
    ): Promise<void> {
        await this.repo.manager.transaction(async (manager) => {
            if (dates.length > 0) {
                await manager.delete(CaretakerAvailability, {
                    caretakerProfileId,
                    date: In(dates),
                });
            }
            if (rows.length > 0) {
                await manager.insert(CaretakerAvailability, rows);
            }
        });
    }
}
