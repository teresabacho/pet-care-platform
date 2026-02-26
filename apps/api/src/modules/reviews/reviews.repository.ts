import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsRepository {
    constructor(
        @InjectRepository(Review)
        private readonly repo: Repository<Review>,
    ) {}

    create(authorId: string, targetId: string, dto: CreateReviewDto): Promise<Review> {
        const review = this.repo.create({ authorId, targetId, ...dto });
        return this.repo.save(review);
    }

    findByBookingId(bookingId: string): Promise<Review | null> {
        return this.repo.findOne({ where: { bookingId } });
    }

    findByTarget(targetId: string): Promise<Review[]> {
        return this.repo.find({
            where: { targetId },
            relations: ['author'],
            order: { createdAt: 'DESC' },
        });
    }

    async getAverageRating(targetId: string): Promise<number> {
        const result = await this.repo
            .createQueryBuilder('r')
            .select('AVG(r.rating)', 'avg')
            .addSelect('COUNT(r.id)', 'count')
            .where('r.target_id = :targetId', { targetId })
            .getRawOne<{ avg: string | null; count: string }>();

        return result?.avg ? parseFloat(parseFloat(result.avg).toFixed(2)) : 0;
    }
}
