import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '@pet-care/shared';

@Injectable()
export class BookingsRepository {
    constructor(
        @InjectRepository(Booking)
        private readonly repo: Repository<Booking>,
    ) {}

    create(ownerId: string, dto: CreateBookingDto): Promise<Booking> {
        const booking = this.repo.create({ ownerId, ...dto, status: BookingStatus.PENDING });
        return this.repo.save(booking);
    }

    findByUser(userId: string): Promise<Booking[]> {
        return this.repo
            .createQueryBuilder('b')
            .leftJoinAndSelect('b.pet', 'pet')
            .where('b.owner_id = :userId OR b.caretaker_id = :userId', { userId })
            .orderBy('b.created_at', 'DESC')
            .getMany();
    }

    findById(id: string): Promise<Booking | null> {
        return this.repo.findOne({ where: { id }, relations: ['pet', 'owner', 'caretaker'] });
    }

    async updateStatus(id: string, status: BookingStatus, timestamps: Partial<Pick<Booking, 'actualStart' | 'actualEnd'>> = {}): Promise<Booking> {
        await this.repo.update(id, { status, ...timestamps });
        return this.repo.findOne({ where: { id }, relations: ['pet', 'owner', 'caretaker'] }) as Promise<Booking>;
    }
}
