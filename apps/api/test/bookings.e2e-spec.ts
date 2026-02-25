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
import { AppModule } from '../src/app.module';
import { BookingStatus, ServiceType } from '@pet-care/shared';

describe('Bookings (e2e)', () => {
    let app: INestApplication;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let petRepo: Repository<Pet>;
    let bookingRepo: Repository<Booking>;

    let ownerToken: string;
    let caretakerToken: string;
    let ownerId: string;
    let caretakerId: string;
    let petId: string;
    let bookingId: string;

    const ownerEmail = `test-bookings-owner-${Date.now()}@test.com`;
    const caretakerEmail = `test-bookings-caretaker-${Date.now()}@test.com`;

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

        const ownerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: ownerEmail, password: 'password123' });
        ownerToken = ownerRes.body.access_token;

        const caretakerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: caretakerEmail, password: 'password123' });
        caretakerToken = caretakerRes.body.access_token;

        const ownerMe = await request(app.getHttpServer())
            .get('/auth/me').set('Authorization', `Bearer ${ownerToken}`);
        ownerId = ownerMe.body.id;

        const caretakerMe = await request(app.getHttpServer())
            .get('/auth/me').set('Authorization', `Bearer ${caretakerToken}`);
        caretakerId = caretakerMe.body.id;

        const petRes = await request(app.getHttpServer())
            .post('/pets')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Тестовий Барсик', species: 'Кіт' });
        petId = petRes.body.id;
    });

    afterAll(async () => {
        await bookingRepo.delete({ ownerId });
        await petRepo.delete({ ownerId });
        await sessionRepo.delete({ userId: ownerId });
        await sessionRepo.delete({ userId: caretakerId });
        await userRepo.delete({ id: ownerId });
        await userRepo.delete({ id: caretakerId });
        await app.close();
    });

    describe('POST /bookings', () => {
        it('should create a booking with PENDING status', async () => {
            const res = await request(app.getHttpServer())
                .post('/bookings')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    caretakerId,
                    petId,
                    serviceType: ServiceType.WALKING,
                    scheduledStart: '2026-04-01T10:00:00.000Z',
                    scheduledEnd: '2026-04-01T11:00:00.000Z',
                    price: 150,
                    notes: 'Тестовий вигул',
                })
                .expect(201);

            expect(res.body.status).toBe(BookingStatus.PENDING);
            expect(res.body.ownerId).toBe(ownerId);
            expect(res.body.caretakerId).toBe(caretakerId);
            bookingId = res.body.id;
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer()).post('/bookings')
                .send({ caretakerId, petId, serviceType: ServiceType.WALKING, scheduledStart: '2026-04-01T10:00:00.000Z', scheduledEnd: '2026-04-01T11:00:00.000Z', price: 100 })
                .expect(401);
        });
    });

    describe('GET /bookings', () => {
        it('owner should see their bookings', async () => {
            const res = await request(app.getHttpServer())
                .get('/bookings')
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.some((b: { id: string }) => b.id === bookingId)).toBe(true);
        });

        it('caretaker should see bookings assigned to them', async () => {
            const res = await request(app.getHttpServer())
                .get('/bookings')
                .set('Authorization', `Bearer ${caretakerToken}`)
                .expect(200);

            expect(res.body.some((b: { id: string }) => b.id === bookingId)).toBe(true);
        });
    });

    describe('GET /bookings/:id', () => {
        it('owner should get booking details', async () => {
            const res = await request(app.getHttpServer())
                .get(`/bookings/${bookingId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(res.body.id).toBe(bookingId);
            expect(res.body.status).toBe(BookingStatus.PENDING);
        });

        it('should return 404 for non-existent booking', async () => {
            await request(app.getHttpServer())
                .get('/bookings/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(404);
        });
    });

    describe('PATCH /bookings/:id/status — state machine', () => {
        it('should confirm booking (PENDING → CONFIRMED)', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status: BookingStatus.CONFIRMED })
                .expect(200);

            expect(res.body.status).toBe(BookingStatus.CONFIRMED);
        });

        it('should reject invalid transition (CONFIRMED → PENDING)', async () => {
            await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status: BookingStatus.PENDING })
                .expect(400);
        });

        it('should start booking (CONFIRMED → IN_PROGRESS) and set actualStart', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status: BookingStatus.IN_PROGRESS })
                .expect(200);

            expect(res.body.status).toBe(BookingStatus.IN_PROGRESS);
            expect(res.body.actualStart).not.toBeNull();
        });

        it('should complete booking (IN_PROGRESS → COMPLETED) and set actualEnd', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status: BookingStatus.COMPLETED })
                .expect(200);

            expect(res.body.status).toBe(BookingStatus.COMPLETED);
            expect(res.body.actualEnd).not.toBeNull();
        });

        it('should reject any transition from COMPLETED', async () => {
            await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status: BookingStatus.CANCELLED })
                .expect(400);
        });
    });
});
