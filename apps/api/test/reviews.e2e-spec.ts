import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { Session } from '../src/modules/auth/entities/session.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { Pet } from '../src/modules/pets/entities/pet.entity';
import { Booking } from '../src/modules/bookings/entities/booking.entity';
import { Review } from '../src/modules/reviews/entities/review.entity';
import { AppModule } from '../src/app.module';
import { BookingStatus, ServiceType } from '@pet-care/shared';

describe('Reviews (e2e)', () => {
    let app: INestApplication;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let petRepo: Repository<Pet>;
    let bookingRepo: Repository<Booking>;
    let reviewRepo: Repository<Review>;

    let ownerToken: string;
    let caretakerToken: string;
    let ownerId: string;
    let caretakerId: string;
    let bookingId: string;

    const ownerEmail = `test-reviews-owner-${Date.now()}@test.com`;
    const caretakerEmail = `test-reviews-caretaker-${Date.now()}@test.com`;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
        await app.init();

        userRepo = moduleFixture.get(getRepositoryToken(User));
        sessionRepo = moduleFixture.get(getRepositoryToken(Session));
        petRepo = moduleFixture.get(getRepositoryToken(Pet));
        bookingRepo = moduleFixture.get(getRepositoryToken(Booking));
        reviewRepo = moduleFixture.get(getRepositoryToken(Review));

        const ownerRes = await request(app.getHttpServer())
            .post('/auth/register').send({ email: ownerEmail, password: 'password123' });
        ownerToken = ownerRes.body.access_token;

        const caretakerRes = await request(app.getHttpServer())
            .post('/auth/register').send({ email: caretakerEmail, password: 'password123' });
        caretakerToken = caretakerRes.body.access_token;

        const ownerMe = await request(app.getHttpServer())
            .get('/auth/me').set('Authorization', `Bearer ${ownerToken}`);
        ownerId = ownerMe.body.id;

        const caretakerMe = await request(app.getHttpServer())
            .get('/auth/me').set('Authorization', `Bearer ${caretakerToken}`);
        caretakerId = caretakerMe.body.id;

        // Налаштовуємо завершений букінг для тестів
        const petRes = await request(app.getHttpServer())
            .post('/pets').set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Тест', species: 'Кіт' });

        const bookingRes = await request(app.getHttpServer())
            .post('/bookings').set('Authorization', `Bearer ${ownerToken}`)
            .send({ caretakerId, petId: petRes.body.id, serviceType: ServiceType.WALKING, scheduledStart: '2026-04-01T10:00:00.000Z', scheduledEnd: '2026-04-01T11:00:00.000Z', price: 150 });
        bookingId = bookingRes.body.id;

        // Проводимо букінг до COMPLETED
        for (const status of [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED]) {
            await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status });
        }
    });

    afterAll(async () => {
        await reviewRepo.delete({ authorId: ownerId });
        await bookingRepo.delete({ ownerId });
        await petRepo.delete({ ownerId });
        await sessionRepo.delete({ userId: ownerId });
        await sessionRepo.delete({ userId: caretakerId });
        await userRepo.delete({ id: ownerId });
        await userRepo.delete({ id: caretakerId });
        await app.close();
    });

    describe('POST /reviews', () => {
        it('should create a review for a completed booking', async () => {
            const res = await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ bookingId, rating: 5, comment: 'Чудовий виконавець!' })
                .expect(201);

            expect(res.body.rating).toBe(5);
            expect(res.body.authorId).toBe(ownerId);
            expect(res.body.targetId).toBe(caretakerId);
        });

        it('should return 409 when review already exists for booking', async () => {
            await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ bookingId, rating: 3 })
                .expect(409);
        });

        it('should return 400 for rating out of range', async () => {
            await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ bookingId, rating: 6 })
                .expect(400);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .post('/reviews')
                .send({ bookingId, rating: 5 })
                .expect(401);
        });
    });

    describe('GET /reviews/user/:id', () => {
        it('should return reviews and average rating for caretaker', async () => {
            const res = await request(app.getHttpServer())
                .get(`/reviews/user/${caretakerId}`)
                .expect(200);

            expect(Array.isArray(res.body.reviews)).toBe(true);
            expect(res.body.reviews.length).toBeGreaterThanOrEqual(1);
            expect(res.body.averageRating).toBe(5);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(1);
        });

        it('should return empty reviews for user with no reviews', async () => {
            const res = await request(app.getHttpServer())
                .get(`/reviews/user/${ownerId}`)
                .expect(200);

            expect(res.body.reviews).toEqual([]);
            expect(res.body.averageRating).toBe(0);
        });
    });
});
