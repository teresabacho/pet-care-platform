import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingsRepository } from './bookings.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingStatus } from '@pet-care/shared';
import { Booking } from './entities/booking.entity';
import { Pet } from '../pets/entities/pet.entity';
import { TrackingService } from '../tracking/tracking.service';
import { ChatService } from '../chat/chat.service';
import { ChatGateway } from '../chat/chat.gateway';
import { BookingPricingService } from './booking-pricing.service';

@Injectable()
export class BookingsService {
    constructor(
        private readonly bookingsRepository: BookingsRepository,
        private readonly trackingService: TrackingService,
        private readonly pricingService: BookingPricingService,
        private readonly chatService: ChatService,
        private readonly chatGateway: ChatGateway,
        @InjectRepository(Pet)
        private readonly petRepo: Repository<Pet>,
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

    async create(ownerId: string, dto: CreateBookingDto): Promise<Booking> {
        const pet = await this.petRepo.findOne({ where: { id: dto.petId } });
        if (!pet) {
            throw new NotFoundException('Тваринку не знайдено');
        }
        if (pet.ownerId !== ownerId) {
            throw new ForbiddenException('Це не ваша тваринка');
        }

        const { price } = await this.pricingService.calculate({
            tierId: dto.tierId,
            addonIds: dto.addonIds ?? [],
            pet,
            scheduledStart: dto.scheduledStart,
            scheduledEnd: dto.scheduledEnd,
        });

        const booking = await this.bookingsRepository.create(ownerId, {
            caretakerId: dto.caretakerId,
            petId: dto.petId,
            serviceType: dto.serviceType,
            scheduledStart: dto.scheduledStart,
            scheduledEnd: dto.scheduledEnd,
            tierId: dto.tierId,
            addonIds: dto.addonIds ?? [],
            price,
            notes: dto.notes ?? null,
        });

        // Auto-create розмову між owner і caretaker (idempotent — якщо вже існує, поверне існуючу).
        try {
            const conv = await this.chatService.startConversation(
                ownerId,
                dto.caretakerId,
            );
            this.chatGateway.addParticipantsToRoom(conv.id, [
                conv.participantAId,
                conv.participantBId,
            ]);
        } catch {
            // Не блокуємо створення замовлення якщо чат впав.
        }

        return booking;
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

        if (dto.status === BookingStatus.CANCELLED) {
            const reason = dto.cancellationReason?.trim();
            if (!reason) {
                throw new BadRequestException(
                    'Вкажіть причину скасування',
                );
            }
            const updated = await this.bookingsRepository.updateStatus(
                id,
                dto.status,
                {
                    cancellationReason: reason,
                    cancelledByUserId: userId,
                    cancelledAt: new Date(),
                },
            );
            await this.trackingService.cancelSession(booking.id);
            return updated;
        }

        return this.bookingsRepository.updateStatus(id, dto.status);
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
