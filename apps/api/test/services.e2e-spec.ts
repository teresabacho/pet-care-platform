import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { Session } from '../src/modules/auth/entities/session.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { CaretakerProfile } from '../src/modules/users/entities/caretaker-profile.entity';
import { ServiceOffering } from '../src/modules/services/entities/service-offering.entity';
import { ServiceTier } from '../src/modules/services/tiers/entities/service-tier.entity';
import { SizeSurcharge } from '../src/modules/services/size-surcharges/entities/size-surcharge.entity';
import { ServiceAddon } from '../src/modules/services/addons/entities/service-addon.entity';
import { WalkingPolicy } from '../src/modules/services/policies/entities/walking-policy.entity';
import { BoardingPolicy } from '../src/modules/services/policies/entities/boarding-policy.entity';
import { AppModule } from '../src/app.module';
import {
    AddonPriceUnit,
    DogSize,
    HomeCondition,
    PetAgeGroup,
    PriceUnit,
    ServiceType,
} from '@pet-care/shared';

describe('Services (e2e) — нова доменна модель 5.5', () => {
    let app: INestApplication;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let profileRepo: Repository<CaretakerProfile>;
    let offeringRepo: Repository<ServiceOffering>;

    let caretakerToken: string;
    let ownerToken: string;
    let caretakerId: string;
    let ownerId: string;
    let caretakerProfileId: string;

    const caretakerEmail = `test-services-caretaker-${Date.now()}@test.com`;
    const ownerEmail = `test-services-owner-${Date.now()}@test.com`;

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
        profileRepo = moduleFixture.get(getRepositoryToken(CaretakerProfile));
        offeringRepo = moduleFixture.get(getRepositoryToken(ServiceOffering));

        const caretakerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: caretakerEmail, password: 'password123' });
        caretakerToken = caretakerRes.body.access_token;

        const ownerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: ownerEmail, password: 'password123' });
        ownerToken = ownerRes.body.access_token;

        const caretakerMe = await request(app.getHttpServer())
            .get('/auth/me')
            .set('Authorization', `Bearer ${caretakerToken}`);
        caretakerId = caretakerMe.body.id;

        const ownerMe = await request(app.getHttpServer())
            .get('/auth/me')
            .set('Authorization', `Bearer ${ownerToken}`);
        ownerId = ownerMe.body.id;

        const profileRes = await request(app.getHttpServer())
            .post('/users/me/caretaker-profile')
            .set('Authorization', `Bearer ${caretakerToken}`)
            .send({
                bio: 'Досвідчений виконавець',
                serviceLatitude: 50.4501,
                serviceLongitude: 30.5234,
                radiusKm: 10,
                addressIsPublic: false,
            });
        caretakerProfileId = profileRes.body.id;
    });

    afterAll(async () => {
        await offeringRepo.delete({ caretakerId: caretakerProfileId });
        await profileRepo.delete({ id: caretakerProfileId });
        await sessionRepo.delete({ userId: caretakerId });
        await sessionRepo.delete({ userId: ownerId });
        await userRepo.delete({ id: caretakerId });
        await userRepo.delete({ id: ownerId });
        await app.close();
    });

    describe('POST /services — транзакційне створення', () => {
        it('створює WALKING offering з tiers + surcharges + addons + walkingPolicy', async () => {
            const res = await request(app.getHttpServer())
                .post('/services')
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({
                    serviceType: ServiceType.WALKING,
                    description: 'Прогулянки в парку',
                    tiers: [
                        { durationMinutes: 30, basePrice: 150, priceUnit: PriceUnit.PER_SESSION },
                        { durationMinutes: 60, basePrice: 250, priceUnit: PriceUnit.PER_SESSION },
                    ],
                    sizeSurcharges: [
                        { petSpecies: 'DOG', size: DogSize.MINI, surchargeAmount: -30 },
                        { petSpecies: 'DOG', size: DogSize.MEDIUM, surchargeAmount: 0 },
                        { petSpecies: 'DOG', size: DogSize.LARGE, surchargeAmount: 80 },
                    ],
                    addons: [
                        { name: 'Помити лапи', price: 50, priceUnit: AddonPriceUnit.PER_BOOKING },
                    ],
                    walkingPolicy: {
                        acceptedDogSizes: [DogSize.MEDIUM, DogSize.LARGE],
                        acceptedAgeGroups: [PetAgeGroup.ADULT, PetAgeGroup.SENIOR],
                        acceptsSpecialNeedsPets: false,
                        maxDogsAtOnce: 2,
                    },
                })
                .expect(201);

            expect(res.body.serviceType).toBe(ServiceType.WALKING);
            expect(res.body.tiers).toHaveLength(2);
            expect(res.body.sizeSurcharges).toHaveLength(3);
            expect(res.body.addons).toHaveLength(1);
            expect(res.body.walkingPolicy).toBeTruthy();
            expect(res.body.walkingPolicy.maxDogsAtOnce).toBe(2);
            expect(res.body.boardingPolicy).toBeNull();
        });

        it('повертає 409 при спробі створити другий offering такого ж типу', async () => {
            await request(app.getHttpServer())
                .post('/services')
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({
                    serviceType: ServiceType.WALKING,
                    tiers: [{ basePrice: 100, priceUnit: PriceUnit.PER_SESSION }],
                    walkingPolicy: {
                        acceptedDogSizes: [DogSize.MEDIUM],
                        acceptedAgeGroups: [PetAgeGroup.ADULT],
                        acceptsSpecialNeedsPets: false,
                        maxDogsAtOnce: 1,
                    },
                })
                .expect(409);
        });

        it('повертає 400 коли передана не та policy', async () => {
            await request(app.getHttpServer())
                .post('/services')
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({
                    serviceType: ServiceType.BOARDING,
                    tiers: [{ basePrice: 500, priceUnit: PriceUnit.PER_DAY }],
                    walkingPolicy: {
                        acceptedDogSizes: [DogSize.MEDIUM],
                        acceptedAgeGroups: [PetAgeGroup.ADULT],
                        acceptsSpecialNeedsPets: false,
                        maxDogsAtOnce: 1,
                    },
                })
                .expect(400);
        });

        it('повертає 400 якщо surchargeAmount для MEDIUM ≠ 0', async () => {
            await request(app.getHttpServer())
                .post('/services')
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({
                    serviceType: ServiceType.PET_SITTING,
                    tiers: [{ basePrice: 400, priceUnit: PriceUnit.PER_DAY }],
                    sizeSurcharges: [
                        { petSpecies: 'DOG', size: DogSize.MEDIUM, surchargeAmount: 50 },
                    ],
                    petSittingPolicy: {
                        acceptedDogSizes: [DogSize.MEDIUM],
                        acceptedCatSizes: [],
                        acceptedAgeGroups: [PetAgeGroup.ADULT],
                        acceptsSpecialNeedsPets: false,
                    },
                })
                .expect(400);
        });

        it('повертає 400 якщо homeConditions містять конфліктну пару', async () => {
            await request(app.getHttpServer())
                .post('/services')
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({
                    serviceType: ServiceType.BOARDING,
                    tiers: [{ basePrice: 700, priceUnit: PriceUnit.PER_DAY }],
                    boardingPolicy: {
                        acceptedDogSizes: [DogSize.MEDIUM],
                        acceptedCatSizes: [],
                        acceptedAgeGroups: [PetAgeGroup.ADULT],
                        acceptsSpecialNeedsPets: false,
                        homeConditions: [HomeCondition.HAS_KIDS, HomeCondition.NO_KIDS],
                    },
                })
                .expect(400);
        });

        it('повертає 401 без токена', async () => {
            await request(app.getHttpServer())
                .post('/services')
                .send({ serviceType: ServiceType.WALKING })
                .expect(401);
        });

        it('повертає 404 коли користувач без caretaker-профілю', async () => {
            await request(app.getHttpServer())
                .post('/services')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    serviceType: ServiceType.WALKING,
                    tiers: [{ basePrice: 100, priceUnit: PriceUnit.PER_SESSION }],
                    walkingPolicy: {
                        acceptedDogSizes: [DogSize.MEDIUM],
                        acceptedAgeGroups: [PetAgeGroup.ADULT],
                        acceptsSpecialNeedsPets: false,
                        maxDogsAtOnce: 1,
                    },
                })
                .expect(404);
        });
    });

    describe('GET /services', () => {
        it('повертає offering-и з relations і обфускує приватну адресу', async () => {
            const res = await request(app.getHttpServer())
                .get(`/services?type=${ServiceType.WALKING}&lat=50.4501&lng=30.5234&radiusKm=5`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            const my = res.body.find(
                (s: { caretaker?: { id?: string } }) =>
                    s.caretaker?.id === caretakerProfileId,
            );
            expect(my).toBeTruthy();
            expect(my.tiers).toHaveLength(2);
            // addressIsPublic=false — координати мають бути зміщені від реальних
            expect(my.caretaker.serviceLatitude).not.toBe(50.4501);
            expect(my.caretaker.serviceLongitude).not.toBe(30.5234);
        });
    });

    describe('GET /services/:id', () => {
        it('повертає offering з усіма залежностями', async () => {
            const list = await request(app.getHttpServer())
                .get(`/services?type=${ServiceType.WALKING}`)
                .expect(200);
            const id = list.body.find(
                (s: { caretaker?: { id?: string }; id: string }) =>
                    s.caretaker?.id === caretakerProfileId,
            ).id;

            const res = await request(app.getHttpServer())
                .get(`/services/${id}`)
                .expect(200);

            expect(res.body.id).toBe(id);
            expect(res.body.tiers).toHaveLength(2);
            expect(res.body.sizeSurcharges).toHaveLength(3);
            expect(res.body.addons).toHaveLength(1);
            expect(res.body.walkingPolicy).toBeTruthy();
        });
    });

    describe('DELETE /services/:id', () => {
        it('каскадно видаляє offering із залежностями', async () => {
            const list = await request(app.getHttpServer())
                .get(`/services/caretaker/${caretakerId}`)
                .expect(200);
            const id = list.body[0].id;

            await request(app.getHttpServer())
                .delete(`/services/${id}`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .expect(204);

            await request(app.getHttpServer())
                .get(`/services/${id}`)
                .expect(404);

            // Перевіряємо, що залежні рядки теж видалено
            const tierRepo = (app as INestApplication).get<Repository<ServiceTier>>(
                getRepositoryToken(ServiceTier),
            );
            const surchargeRepo = (app as INestApplication).get<Repository<SizeSurcharge>>(
                getRepositoryToken(SizeSurcharge),
            );
            const addonRepo = (app as INestApplication).get<Repository<ServiceAddon>>(
                getRepositoryToken(ServiceAddon),
            );
            const wpRepo = (app as INestApplication).get<Repository<WalkingPolicy>>(
                getRepositoryToken(WalkingPolicy),
            );
            // BoardingPolicy теж — для повноти
            void (app as INestApplication).get<Repository<BoardingPolicy>>(
                getRepositoryToken(BoardingPolicy),
            );
            expect(await tierRepo.count({ where: { serviceOfferingId: id } })).toBe(0);
            expect(await surchargeRepo.count({ where: { serviceOfferingId: id } })).toBe(0);
            expect(await addonRepo.count({ where: { serviceOfferingId: id } })).toBe(0);
            expect(await wpRepo.count({ where: { serviceOfferingId: id } })).toBe(0);
        });
    });
});
