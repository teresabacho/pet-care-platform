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
import { AppModule } from '../src/app.module';
import { ServiceType } from '@pet-care/shared';

describe('Services (e2e)', () => {
    let app: INestApplication;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let profileRepo: Repository<CaretakerProfile>;
    let offeringRepo: Repository<ServiceOffering>;

    let caretakerToken: string;
    let ownerToken: string;
    let caretakerId: string;
    let ownerId: string;

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

        await request(app.getHttpServer())
            .post('/users/me/caretaker-profile')
            .set('Authorization', `Bearer ${caretakerToken}`)
            .send({
                bio: 'Досвідчений виконавець',
                serviceLatitude: 50.4501,
                serviceLongitude: 30.5234,
                radiusKm: 10,
            });
    });

    afterAll(async () => {
        const profile = await profileRepo.findOne({ where: { userId: caretakerId } });
        if (profile) {
            await offeringRepo.delete({ caretakerId: profile.id });
            await profileRepo.delete({ id: profile.id });
        }
        await sessionRepo.delete({ userId: caretakerId });
        await sessionRepo.delete({ userId: ownerId });
        await userRepo.delete({ id: caretakerId });
        await userRepo.delete({ id: ownerId });
        await app.close();
    });

    describe('POST /services', () => {
        it('should create a service offering', async () => {
            const res = await request(app.getHttpServer())
                .post('/services')
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({
                    serviceType: ServiceType.WALKING,
                    price: 150,
                    durationMinutes: 60,
                    description: 'Вигул собак у парку',
                })
                .expect(201);

            expect(res.body.serviceType).toBe(ServiceType.WALKING);
            expect(Number(res.body.price)).toBe(150);
            expect(res.body.durationMinutes).toBe(60);
        });

        it('should return 404 if user has no caretaker profile', async () => {
            await request(app.getHttpServer())
                .post('/services')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ serviceType: ServiceType.WALKING, price: 100 })
                .expect(404);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .post('/services')
                .send({ serviceType: ServiceType.WALKING, price: 100 })
                .expect(401);
        });

        it('should return 400 for invalid service type', async () => {
            await request(app.getHttpServer())
                .post('/services')
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({ serviceType: 'INVALID_TYPE', price: 100 })
                .expect(400);
        });
    });

    describe('GET /services', () => {
        it('should return all services without filters', async () => {
            const res = await request(app.getHttpServer())
                .get('/services')
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        it('should filter by service type', async () => {
            const res = await request(app.getHttpServer())
                .get(`/services?type=${ServiceType.WALKING}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            res.body.forEach((s: { serviceType: string }) => {
                expect(s.serviceType).toBe(ServiceType.WALKING);
            });
        });

        it('should filter by location (geo-search)', async () => {
            const res = await request(app.getHttpServer())
                .get('/services?lat=50.4501&lng=30.5234&radiusKm=5')
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('GET /services/caretaker/:userId', () => {
        it('should return services of a specific caretaker', async () => {
            const res = await request(app.getHttpServer())
                .get(`/services/caretaker/${caretakerId}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        it('should return 404 for user without caretaker profile', async () => {
            await request(app.getHttpServer())
                .get(`/services/caretaker/${ownerId}`)
                .expect(404);
        });
    });
});
