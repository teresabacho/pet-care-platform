import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewsRepository } from './reviews.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '@pet-care/shared';

@Injectable()
export class ReviewsService {
    constructor(
        private readonly reviewsRepository: ReviewsRepository,
        @InjectRepository(Booking)
        private readonly bookingRepo: Repository<Booking>,
    ) {}

    async create(authorId: string, dto: CreateReviewDto) {

        const booking = await this.bookingRepo.findOne({where: {id: dto.bookingId}});
        if (!booking) {throw new NotFoundException('Послуга не знайдена');}

        if (booking.status !== BookingStatus.COMPLETED) {
            throw new BadRequestException("Можна залишити відгук тільки після завершеної послуги");
        }

        if (booking.ownerId !== authorId) {
            throw new ForbiddenException("Не є власником цієї послуги")
        }

        if (await this.reviewsRepository.findByBookingId(dto.bookingId)){
            throw new ConflictException('Відгук для цієї послуги вже існує')
        }

        return this.reviewsRepository.create(authorId, booking.caretakerId, dto)
    }

    async findByUser(targetId: string) {
        const [reviews, averageRating] = await Promise.all([
            this.reviewsRepository.findByTarget(targetId),
            this.reviewsRepository.getAverageRating(targetId),
        ]);
        return { reviews, averageRating, totalCount: reviews.length };
    }
}
