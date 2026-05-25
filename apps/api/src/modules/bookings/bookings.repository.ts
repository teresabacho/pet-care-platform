import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingStatus, ServiceType } from '@pet-care/shared';

interface CreateBookingData {
    caretakerId: string;
    petId: string;
    serviceType: ServiceType;
    tierId: string;
    addonIds: string[];
    scheduledStart: Date;
    scheduledEnd: Date;
    price: number;
    notes: string | null;
}

@Injectable()
export class BookingsRepository {
    constructor(
        @InjectRepository(Booking)
        private readonly repo: Repository<Booking>,
    ) {}

    create(ownerId: string, data: CreateBookingData): Promise<Booking> {
        const booking = this.repo.create({ ownerId, ...data, status: BookingStatus.PENDING });
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
        return this.repo.findOne({ where: { id }, relations: ['pet', 'owner', 'caretaker', 'caretaker.caretakerProfile']});
    }

    async updateStatus(
        id: string,
        status: BookingStatus,
        extra: Partial<
            Pick<
                Booking,
                | 'actualStart'
                | 'actualEnd'
                | 'cancellationReason'
                | 'cancelledByUserId'
                | 'cancelledAt'
            >
        > = {},
    ): Promise<Booking> {
        await this.repo.update(id, { status, ...extra });
        return this.repo.findOne({ where: { id }, relations: ['pet', 'owner', 'caretaker', 'caretaker.caretakerProfile']}) as Promise<Booking>;
    }

    async setConfirmationFlag(
        id: string,
        field: 'handoverConfirmedByOwner' | 'handoverConfirmedByCaretaker' | 'returnConfirmedByOwner' | 'returnConfirmedByCaretaker',
    ): Promise<Booking> {
        await this.repo.update(id, { [field]: true });
        return this.repo.findOne({ where: { id }, relations: ['pet', 'owner', 'caretaker', 'caretaker.caretakerProfile']}) as Promise<Booking>;
    }
}
