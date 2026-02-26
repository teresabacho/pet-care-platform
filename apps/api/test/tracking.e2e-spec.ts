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
import { WalkSegment } from '../src/modules/tracking/entities/walk-segment.entity';
import { BookingStatus, ServiceType } from '@pet-care/shared';

describe('Tracking (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let petRepo: Repository<Pet>;
    let bookingRepo: Repository<Booking>;
    let trackingSessionRepo: Repository<TrackingSession>;
    let walkSegmentRepo: Repository<WalkSegment>;

    let ownerToken: string;
    let caretakerToken: string;
    let ownerId: string;
    let caretakerId: string;

    // Separate bookings for WALKING and PET_SITTING tests
    let walkingBookingId: string;
    let petsittingBookingId: string;
    let walkingSessionId: string;
    let petsittingSessionId: string;

    const ownerEmail = `test-tracking-owner-${Date.now()}@test.com`;
    const caretakerEmail = `test-tracking-caretaker-${Date.now()}@test.com`;

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
        walkSegmentRepo = moduleFixture.get(getRepositoryToken(WalkSegment));

        // Register users
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

        // Create a pet
        const petRes = await request(app.getHttpServer())
            .post('/pets').set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Барсик', species: 'Собака' });

        const petId = petRes.body.id;

        // Create and advance a WALKING booking to IN_PROGRESS
        const walkingRes = await request(app.getHttpServer())
            .post('/bookings').set('Authorization', `Bearer ${ownerToken}`)
            .send({
                caretakerId, petId, serviceType: ServiceType.WALKING,
                scheduledStart: '2026-05-01T10:00:00.000Z',
                scheduledEnd: '2026-05-01T11:00:00.000Z',
                price: 200,
            });
        walkingBookingId = walkingRes.body.id;

        // Create and advance a PET_SITTING booking to IN_PROGRESS
        const petsittingRes = await request(app.getHttpServer())
            .post('/bookings').set('Authorization', `Bearer ${ownerToken}`)
            .send({
                caretakerId, petId, serviceType: ServiceType.PET_SITTING,
                scheduledStart: '2026-05-02T10:00:00.000Z',
                scheduledEnd: '2026-05-04T10:00:00.000Z',
                price: 800,
            });
        petsittingBookingId = petsittingRes.body.id;

        // Helper: advance a booking to IN_PROGRESS via CONFIRMED → HANDOVER_PENDING → confirm-handover x2
        const advanceToInProgress = async (bookingId: string) => {
            for (const status of [BookingStatus.CONFIRMED, BookingStatus.HANDOVER_PENDING]) {
                await request(app.getHttpServer())
                    .patch(`/bookings/${bookingId}/status`)
                    .set('Authorization', `Bearer ${caretakerToken}`)
                    .send({ status });
            }
            await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-handover`)
                .set('Authorization', `Bearer ${ownerToken}`);
            await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-handover`)
                .set('Authorization', `Bearer ${caretakerToken}`);
        };

        await advanceToInProgress(walkingBookingId);
        await advanceToInProgress(petsittingBookingId);

        // Fetch session IDs for later tests
        const walkingSession = await trackingSessionRepo.findOne({ where: { bookingId: walkingBookingId } });
        walkingSessionId = walkingSession!.id;

        const petsittingSession = await trackingSessionRepo.findOne({ where: { bookingId: petsittingBookingId } });
        petsittingSessionId = petsittingSession!.id;
    });

    afterAll(async () => {
        // TrackPoints, WalkSegments cascade from TrackingSession; TrackingSession cascades from Booking
        await bookingRepo.delete({ ownerId });
        await petRepo.delete({ ownerId });
        await sessionRepo.delete({ userId: ownerId });
        await sessionRepo.delete({ userId: caretakerId });
        await userRepo.delete({ id: ownerId });
        await userRepo.delete({ id: caretakerId });
        await app.close();
    });

    describe('Auto session creation on IN_PROGRESS', () => {
        it('should auto-create TrackingSession for WALKING booking', async () => {
            const session = await trackingSessionRepo.findOne({ where: { bookingId: walkingBookingId } });
            expect(session).not.toBeNull();
            expect(session!.status).toBe('ACTIVE');
        });

        it('should NOT auto-create WalkSegment for WALKING booking (caretaker starts it manually)', async () => {
            const segments = await walkSegmentRepo.find({ where: { sessionId: walkingSessionId } });
            expect(segments.length).toBe(0);
        });

        it('should auto-create TrackingSession for PET_SITTING booking', async () => {
            const session = await trackingSessionRepo.findOne({ where: { bookingId: petsittingBookingId } });
            expect(session).not.toBeNull();
            expect(session!.status).toBe('ACTIVE');
        });

        it('should NOT auto-create WalkSegment for PET_SITTING booking', async () => {
            const segments = await walkSegmentRepo.find({ where: { sessionId: petsittingSessionId } });
            expect(segments.length).toBe(0);
        });
    });

    describe('GET /tracking/sessions/booking/:bookingId', () => {
        it('should return session with segments for WALKING booking', async () => {
            const res = await request(app.getHttpServer())
                .get(`/tracking/sessions/booking/${walkingBookingId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(res.body.session.bookingId).toBe(walkingBookingId);
            expect(res.body.session.status).toBe('ACTIVE');
            expect(Array.isArray(res.body.segments)).toBe(true);
            expect(res.body.segments.length).toBe(1);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .get(`/tracking/sessions/booking/${walkingBookingId}`)
                .expect(401);
        });
    });

    describe('POST /tracking/sessions/:sessionId/walk-segments (PET_SITTING)', () => {
        let createdSegmentId: string;

        it('should create a walk segment for PET_SITTING session', async () => {
            const res = await request(app.getHttpServer())
                .post(`/tracking/sessions/${petsittingSessionId}/walk-segments`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .expect(201);

            expect(res.body.sessionId).toBe(petsittingSessionId);
            expect(res.body.status).toBe('ACTIVE');
            createdSegmentId = res.body.id;
        });

        it('should return 409 when active segment already exists', async () => {
            await request(app.getHttpServer())
                .post(`/tracking/sessions/${petsittingSessionId}/walk-segments`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .expect(409);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .post(`/tracking/sessions/${petsittingSessionId}/walk-segments`)
                .expect(401);
        });

        describe('PATCH /tracking/walk-segments/:segmentId/complete', () => {
            it('should complete the walk segment', async () => {
                const res = await request(app.getHttpServer())
                    .patch(`/tracking/walk-segments/${createdSegmentId}/complete`)
                    .set('Authorization', `Bearer ${caretakerToken}`)
                    .expect(200);

                expect(res.body.status).toBe('COMPLETED');
                expect(res.body.endedAt).toBeDefined();
            });

            it('should return 400 when segment already completed', async () => {
                await request(app.getHttpServer())
                    .patch(`/tracking/walk-segments/${createdSegmentId}/complete`)
                    .set('Authorization', `Bearer ${caretakerToken}`)
                    .expect(400);
            });
        });
    });

    describe('Auto session completion on COMPLETED booking', () => {
        it('should close TrackingSession when booking reaches COMPLETED', async () => {
            // WALKING: IN_PROGRESS → RETURN_PENDING → confirm-return x2 → COMPLETED
            await request(app.getHttpServer())
                .patch(`/bookings/${walkingBookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status: BookingStatus.RETURN_PENDING });
            await request(app.getHttpServer())
                .post(`/bookings/${walkingBookingId}/confirm-return`)
                .set('Authorization', `Bearer ${ownerToken}`);
            await request(app.getHttpServer())
                .post(`/bookings/${walkingBookingId}/confirm-return`)
                .set('Authorization', `Bearer ${caretakerToken}`);

            const session = await trackingSessionRepo.findOne({ where: { bookingId: walkingBookingId } });
            expect(session!.status).toBe('COMPLETED');
            expect(session!.endedAt).not.toBeNull();
        });

        it('should have no open WalkSegments after session completes', async () => {
            const segments = await walkSegmentRepo.find({ where: { sessionId: walkingSessionId } });
            // No auto-created segments for WALKING — caretaker manages them manually
            // Any segment that existed would be COMPLETED; none were created in this test
            const openSegments = segments.filter(s => s.status === 'ACTIVE');
            expect(openSegments.length).toBe(0);
        });
    });

    describe('GET /tracking/sessions/:sessionId/points', () => {
        it('should return empty array when no points exist', async () => {
            const res = await request(app.getHttpServer())
                .get(`/tracking/sessions/${petsittingSessionId}/points`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .get(`/tracking/sessions/${petsittingSessionId}/points`)
                .expect(401);
        });
    });
});
