import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingsRepository } from './bookings.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingStatus } from '@pet-care/shared';
import { Booking } from './entities/booking.entity';
import { TrackingService } from '../tracking/tracking.service';

@Injectable()
export class BookingsService {
    constructor(
        private readonly bookingsRepository: BookingsRepository,
        private readonly trackingService: TrackingService,
    ) {}

    // HANDOVER_PENDING and RETURN_PENDING can only be exited via confirm endpoints, not via PATCH /status
    private readonly VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
        [BookingStatus.PENDING]:           [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
        [BookingStatus.CONFIRMED]:         [BookingStatus.HANDOVER_PENDING, BookingStatus.CANCELLED],
        [BookingStatus.HANDOVER_PENDING]:  [],
        [BookingStatus.IN_PROGRESS]:       [BookingStatus.RETURN_PENDING, BookingStatus.CANCELLED],
        [BookingStatus.RETURN_PENDING]:    [],
        [BookingStatus.COMPLETED]:         [],
        [BookingStatus.CANCELLED]:         [],
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

        const updated = await this.bookingsRepository.updateStatus(id, dto.status);

        if (dto.status === BookingStatus.CANCELLED) {
            await this.trackingService.cancelSession(booking.id);
        }

        return updated;
    }

    async confirmHandover(bookingId: string, userId: string): Promise<Booking> {
        const booking = await this.bookingsRepository.findById(bookingId);
        if (!booking) throw new NotFoundException('Замовлення не знайдено');

        if (booking.ownerId !== userId && booking.caretakerId !== userId) {
            throw new ForbiddenException('Немає доступу');
        }

        if (booking.status !== BookingStatus.HANDOVER_PENDING) {
            throw new BadRequestException('Підтвердити передачу можна тільки зі статусу HANDOVER_PENDING');
        }

        const isOwner = userId === booking.ownerId;
        const field = isOwner ? 'handoverConfirmedByOwner' : 'handoverConfirmedByCaretaker';
        const isAlreadyConfirmed = isOwner ? booking.handoverConfirmedByOwner : booking.handoverConfirmedByCaretaker;

        if (isAlreadyConfirmed) {
            throw new ConflictException('Ви вже підтвердили передачу');
        }

        const updated = await this.bookingsRepository.setConfirmationFlag(bookingId, field);

        if (updated.handoverConfirmedByOwner && updated.handoverConfirmedByCaretaker) {
            const inProgress = await this.bookingsRepository.updateStatus(bookingId, BookingStatus.IN_PROGRESS, { actualStart: new Date() });
            await this.trackingService.createSession(bookingId);
            return inProgress;
        }

        return updated;
    }

    async confirmReturn(bookingId: string, userId: string): Promise<Booking> {
        const booking = await this.bookingsRepository.findById(bookingId);
        if (!booking) throw new NotFoundException('Замовлення не знайдено');

        if (booking.ownerId !== userId && booking.caretakerId !== userId) {
            throw new ForbiddenException('Немає доступу');
        }

        if (booking.status !== BookingStatus.RETURN_PENDING) {
            throw new BadRequestException('Підтвердити повернення можна тільки зі статусу RETURN_PENDING');
        }

        const isOwner = userId === booking.ownerId;
        const field = isOwner ? 'returnConfirmedByOwner' : 'returnConfirmedByCaretaker';
        const alreadyConfirmed = isOwner ? booking.returnConfirmedByOwner : booking.returnConfirmedByCaretaker;

        if (alreadyConfirmed) {
            throw new ConflictException('Ви вже підтвердили повернення');
        }

        const updated = await this.bookingsRepository.setConfirmationFlag(bookingId, field);

        if (updated.returnConfirmedByOwner && updated.returnConfirmedByCaretaker) {
            const completed = await this.bookingsRepository.updateStatus(bookingId, BookingStatus.COMPLETED, { actualEnd: new Date() });
            await this.trackingService.completeSession(bookingId);
            return completed;
        }

        return updated;
    }
}
