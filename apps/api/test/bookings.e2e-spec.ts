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
import { CaretakerProfile } from '../src/modules/users/entities/caretaker-profile.entity';
import { ServiceOffering } from '../src/modules/services/entities/service-offering.entity';
import { AppModule } from '../src/app.module';
import {
    AddonPriceUnit,
    BookingStatus,
    DogSize,
    PetAgeGroup,
    PriceUnit,
    ServiceType,
} from '@pet-care/shared';

describe('Bookings (e2e)', () => {
    let app: INestApplication;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let petRepo: Repository<Pet>;
    let bookingRepo: Repository<Booking>;
    let profileRepo: Repository<CaretakerProfile>;
    let offeringRepo: Repository<ServiceOffering>;

    let ownerToken: string;
    let caretakerToken: string;
    let ownerId: string;
    let caretakerId: string;
    let caretakerProfileId: string;
    let offeringId: string;
    let walkingTierId: string;
    let petSittingTierId: string;
    let addonId: string;
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
        profileRepo = moduleFixture.get(getRepositoryToken(CaretakerProfile));
        offeringRepo = moduleFixture.get(getRepositoryToken(ServiceOffering));

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

        // Caretaker profile + WALKING offering з tier і addon-ом
        const profileRes = await request(app.getHttpServer())
            .post('/users/me/caretaker-profile')
            .set('Authorization', `Bearer ${caretakerToken}`)
            .send({ bio: 'Test', serviceLatitude: 50.45, serviceLongitude: 30.52, radiusKm: 5 });
        caretakerProfileId = profileRes.body.id;

        const offeringRes = await request(app.getHttpServer())
            .post('/services')
            .set('Authorization', `Bearer ${caretakerToken}`)
            .send({
                serviceType: ServiceType.WALKING,
                tiers: [{ durationMinutes: 60, basePrice: 200, priceUnit: PriceUnit.PER_SESSION }],
                sizeSurcharges: [
                    { petSpecies: 'DOG', size: DogSize.MEDIUM, surchargeAmount: 0 },
                    { petSpecies: 'DOG', size: DogSize.LARGE, surchargeAmount: 100 },
                ],
                addons: [
                    { name: 'Помити лапи', price: 50, priceUnit: AddonPriceUnit.PER_BOOKING },
                ],
                walkingPolicy: {
                    acceptedDogSizes: [DogSize.MEDIUM, DogSize.LARGE],
                    acceptedAgeGroups: [PetAgeGroup.ADULT],
                    acceptsSpecialNeedsPets: false,
                    maxDogsAtOnce: 1,
                },
            });
        offeringId = offeringRes.body.id;
        walkingTierId = offeringRes.body.tiers[0].id;
        addonId = offeringRes.body.addons[0].id;

        // PET_SITTING offering (потрібен у тесті 400 для confirm-handover)
        const petSittingOffering = await request(app.getHttpServer())
            .post('/services')
            .set('Authorization', `Bearer ${caretakerToken}`)
            .send({
                serviceType: ServiceType.PET_SITTING,
                tiers: [{ basePrice: 600, priceUnit: PriceUnit.PER_DAY }],
                petSittingPolicy: {
                    acceptedDogSizes: [DogSize.MEDIUM],
                    acceptedCatSizes: [],
                    acceptedAgeGroups: [PetAgeGroup.ADULT],
                    acceptsSpecialNeedsPets: false,
                },
            });
        petSittingTierId = petSittingOffering.body.tiers[0].id;

        const petRes = await request(app.getHttpServer())
            .post('/pets')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Тестовий Барсик', species: 'dog', size: DogSize.MEDIUM });
        petId = petRes.body.id;
    });

    afterAll(async () => {
        await bookingRepo.delete({ ownerId });
        await petRepo.delete({ ownerId });
        await offeringRepo.delete({ caretakerId: caretakerProfileId });
        await profileRepo.delete({ id: caretakerProfileId });
        await sessionRepo.delete({ userId: ownerId });
        await sessionRepo.delete({ userId: caretakerId });
        await userRepo.delete({ id: ownerId });
        await userRepo.delete({ id: caretakerId });
        await app.close();
    });

    describe('POST /bookings', () => {
        it('обчислює ціну з tier + addon (MEDIUM dog → 200 + 50 = 250)', async () => {
            const res = await request(app.getHttpServer())
                .post('/bookings')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    caretakerId,
                    petId,
                    serviceType: ServiceType.WALKING,
                    tierId: walkingTierId,
                    addonIds: [addonId],
                    scheduledStart: '2026-04-01T10:00:00.000Z',
                    scheduledEnd: '2026-04-01T11:00:00.000Z',
                    notes: 'Тестовий вигул',
                })
                .expect(201);

            expect(res.body.status).toBe(BookingStatus.PENDING);
            expect(res.body.ownerId).toBe(ownerId);
            expect(res.body.caretakerId).toBe(caretakerId);
            expect(Number(res.body.price)).toBe(250);
            expect(res.body.tierId).toBe(walkingTierId);
            expect(res.body.addonIds).toEqual([addonId]);
            // Не перевизначаємо bookingId якщо вже встановлений (для подальших тестів стейт-машини)
            bookingId = res.body.id;
        });

        it('повертає 401 без токена', async () => {
            await request(app.getHttpServer()).post('/bookings')
                .send({
                    caretakerId, petId, serviceType: ServiceType.WALKING,
                    tierId: walkingTierId,
                    scheduledStart: '2026-04-01T10:00:00.000Z',
                    scheduledEnd: '2026-04-01T11:00:00.000Z',
                })
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

        it('should reject direct transition to IN_PROGRESS (must go through HANDOVER_PENDING)', async () => {
            await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status: BookingStatus.IN_PROGRESS })
                .expect(400);
        });

        it('should move to HANDOVER_PENDING (CONFIRMED → HANDOVER_PENDING)', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status: BookingStatus.HANDOVER_PENDING })
                .expect(200);

            expect(res.body.status).toBe(BookingStatus.HANDOVER_PENDING);
        });

        it('should reject direct status change from HANDOVER_PENDING', async () => {
            await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status: BookingStatus.IN_PROGRESS })
                .expect(400);
        });
    });

    describe('POST /bookings/:id/confirm-handover', () => {
        it('should return 400 when status is not HANDOVER_PENDING', async () => {
            const otherRes = await request(app.getHttpServer())
                .post('/bookings')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    caretakerId, petId, serviceType: ServiceType.PET_SITTING,
                    tierId: petSittingTierId,
                    scheduledStart: '2026-06-01T10:00:00.000Z',
                    scheduledEnd: '2026-06-03T10:00:00.000Z',
                });
            const otherId = otherRes.body.id;

            await request(app.getHttpServer())
                .post(`/bookings/${otherId}/confirm-handover`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(400);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-handover`)
                .expect(401);
        });

        it('first confirmation (owner) — status stays HANDOVER_PENDING, flag set', async () => {
            const res = await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-handover`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(201);

            expect(res.body.status).toBe(BookingStatus.HANDOVER_PENDING);
            expect(res.body.handoverConfirmedByOwner).toBe(true);
            expect(res.body.handoverConfirmedByCaretaker).toBe(false);
        });

        it('should return 409 when same side confirms twice', async () => {
            await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-handover`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(409);
        });

        it('second confirmation (caretaker) — status becomes IN_PROGRESS, TrackingSession created', async () => {
            const res = await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-handover`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .expect(201);

            expect(res.body.status).toBe(BookingStatus.IN_PROGRESS);
            expect(res.body.handoverConfirmedByOwner).toBe(true);
            expect(res.body.handoverConfirmedByCaretaker).toBe(true);
            expect(res.body.actualStart).not.toBeNull();
        });
    });

    describe('POST /bookings/:id/confirm-return', () => {
        it('should return 400 when status is not RETURN_PENDING', async () => {
            // bookingId is IN_PROGRESS at this point, not RETURN_PENDING yet
            await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-return`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(400);
        });

        it('should move to RETURN_PENDING (IN_PROGRESS → RETURN_PENDING)', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/bookings/${bookingId}/status`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ status: BookingStatus.RETURN_PENDING })
                .expect(200);

            expect(res.body.status).toBe(BookingStatus.RETURN_PENDING);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-return`)
                .expect(401);
        });

        it('first confirmation (caretaker) — status stays RETURN_PENDING, flag set', async () => {
            const res = await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-return`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .expect(201);

            expect(res.body.status).toBe(BookingStatus.RETURN_PENDING);
            expect(res.body.returnConfirmedByCaretaker).toBe(true);
            expect(res.body.returnConfirmedByOwner).toBe(false);
        });

        it('should return 409 when same side confirms twice', async () => {
            await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-return`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .expect(409);
        });

        it('second confirmation (owner) — status becomes COMPLETED', async () => {
            const res = await request(app.getHttpServer())
                .post(`/bookings/${bookingId}/confirm-return`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(201);

            expect(res.body.status).toBe(BookingStatus.COMPLETED);
            expect(res.body.returnConfirmedByOwner).toBe(true);
            expect(res.body.returnConfirmedByCaretaker).toBe(true);
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
