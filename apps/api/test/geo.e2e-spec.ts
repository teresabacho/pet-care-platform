import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Session } from '../src/modules/auth/entities/session.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { Pet } from '../src/modules/pets/entities/pet.entity';
import { Booking } from '../src/modules/bookings/entities/booking.entity';
import { TrackingSession } from '../src/modules/tracking/entities/tracking-session.entity';
import { BookingStatus, ServiceType } from '@pet-care/shared';

describe('Geo (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let petRepo: Repository<Pet>;
    let bookingRepo: Repository<Booking>;
    let trackingSessionRepo: Repository<TrackingSession>;

    let ownerToken: string;
    let caretakerToken: string;
    let ownerId: string;
    let caretakerId: string;
    let bookingId: string;
    let sessionId: string;

    const ownerEmail = `test-geo-owner-${Date.now()}@test.com`;
    const caretakerEmail = `test-geo-caretaker-${Date.now()}@test.com`;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
        await app.init();

        dataSource = moduleFixture.get(DataSource);
        userRepo = moduleFixture.get(getRepositoryToken(User));
        sessionRepo = moduleFixture.get(getRepositoryToken(Session));
        petRepo = moduleFixture.get(getRepositoryToken(Pet));
        bookingRepo = moduleFixture.get(getRepositoryToken(Booking));
        trackingSessionRepo = moduleFixture.get(getRepositoryToken(TrackingSession));

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

        const petRes = await request(app.getHttpServer())
            .post('/pets').set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Рекс', species: 'Собака' });

        const bookingRes = await request(app.getHttpServer())
            .post('/bookings').set('Authorization', `Bearer ${ownerToken}`)
            .send({
                caretakerId, petId: petRes.body.id, serviceType: ServiceType.PET_SITTING,
                scheduledStart: '2026-06-01T10:00:00.000Z',
                scheduledEnd: '2026-06-03T10:00:00.000Z',
                price: 600,
            });
        bookingId = bookingRes.body.id;

        for (const status of [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]) {
            await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status });
        }

        const trackSession = await trackingSessionRepo.findOne({ where: { bookingId } });
        sessionId = trackSession!.id;
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

    describe('POST /geo/geofences', () => {
        let geofenceId: string;

        it('should create a geofence for the session (owner)', async () => {
            const res = await request(app.getHttpServer())
                .post('/geo/geofences')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ sessionId, centerLat: 50.4501, centerLng: 30.5234, radiusMeters: 500 })
                .expect(201);

            expect(res.body.sessionId).toBe(sessionId);
            expect(res.body.centerLat).toBe(50.4501);
            expect(res.body.radiusMeters).toBe(500);
            geofenceId = res.body.id;
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .post('/geo/geofences')
                .send({ sessionId, centerLat: 50.4501, centerLng: 30.5234, radiusMeters: 500 })
                .expect(401);
        });

        it('should return 400 for invalid radiusMeters', async () => {
            await request(app.getHttpServer())
                .post('/geo/geofences')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ sessionId, centerLat: 50.4501, centerLng: 30.5234, radiusMeters: 5 }) // below @Min(10)
                .expect(400);
        });

        describe('GET /geo/geofences/session/:sessionId', () => {
            it('should return the geofence for the session', async () => {
                const res = await request(app.getHttpServer())
                    .get(`/geo/geofences/session/${sessionId}`)
                    .set('Authorization', `Bearer ${ownerToken}`)
                    .expect(200);

                expect(res.body.sessionId).toBe(sessionId);
            });
        });

        describe('GET /geo/stats/session/:sessionId', () => {
            it('should return session stats (empty walk history)', async () => {
                const res = await request(app.getHttpServer())
                    .get(`/geo/stats/session/${sessionId}`)
                    .set('Authorization', `Bearer ${ownerToken}`)
                    .expect(200);

                expect(res.body.walkCount).toBe(0);
                expect(res.body.totalDistanceMeters).toBe(0);
            });
        });

        describe('DELETE /geo/geofences/:id', () => {
            it('should delete the geofence', async () => {
                await request(app.getHttpServer())
                    .delete(`/geo/geofences/${geofenceId}`)
                    .set('Authorization', `Bearer ${ownerToken}`)
                    .expect(200);
            });

            it('GET should return empty after deletion', async () => {
                const res = await request(app.getHttpServer())
                    .get(`/geo/geofences/session/${sessionId}`)
                    .set('Authorization', `Bearer ${ownerToken}`)
                    .expect(200);

                // NestJS serializes null as {} with ClassSerializerInterceptor
                expect(res.body).not.toHaveProperty('id');
            });
        });
    });
});
