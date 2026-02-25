import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {BookingsRepository} from './bookings.repository';
import {CreateBookingDto} from './dto/create-booking.dto';
import {UpdateBookingStatusDto} from './dto/update-booking-status.dto';
import {BookingStatus} from '@pet-care/shared';
import {Booking} from './entities/booking.entity';

@Injectable()
export class BookingsService {
    constructor(private readonly bookingsRepository: BookingsRepository) {}

    // IN_PROGRESS → CANCELLED дозволено для форс-мажорних ситуацій (хвороба виконавця тощо)
    private readonly VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
        [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
        [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
        [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
        [BookingStatus.COMPLETED]: [],
        [BookingStatus.CANCELLED]: [],
    };

    create(ownerId: string, dto: CreateBookingDto): Promise<Booking> {
        return this.bookingsRepository.create(ownerId, dto);
    }

    getMyBookings(userId: string): Promise<Booking[]> {
        return this.bookingsRepository.findByUser(userId);
    }

    async getOne(id: string, userId: string): Promise<Booking> {
        const booking = await this.bookingsRepository.findById(id);
        if (!booking) throw new NotFoundException('Замовлення не знайдено');
        if (booking.ownerId !== userId && booking.caretakerId !== userId) {
            throw new ForbiddenException('Немає доступу');
        }
        return booking;
    }

    async updateStatus(id: string, userId: string, dto: UpdateBookingStatusDto): Promise<Booking> {
        const booking = await this.bookingsRepository.findById(id);
        if (!booking) throw new NotFoundException('Замовлення не знайдено');

        if (booking.ownerId !== userId && booking.caretakerId !== userId) {
            throw new ForbiddenException('Немає доступу');
        }

        const allowed = this.VALID_TRANSITIONS[booking.status];
        if (!allowed.includes(dto.status)) {
            throw new BadRequestException(
                `Неможливо перейти зі статусу ${booking.status} до ${dto.status}`,
            );
        }

        const timestamps: Partial<Pick<Booking, 'actualStart' | 'actualEnd'>> = {};
        if (dto.status === BookingStatus.IN_PROGRESS) timestamps.actualStart = new Date();
        if (dto.status === BookingStatus.COMPLETED) timestamps.actualEnd = new Date();

        return this.bookingsRepository.updateStatus(id, dto.status, timestamps);
    }
}
