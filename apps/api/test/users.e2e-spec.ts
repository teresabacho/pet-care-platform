import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { Session } from '../src/modules/auth/entities/session.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { CaretakerProfile } from '../src/modules/users/entities/caretaker-profile.entity';
import { AppModule } from '../src/app.module';
import { ServiceType } from '@pet-care/shared';

describe('Users (e2e)', () => {
    let app: INestApplication;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let caretakerProfileRepo: Repository<CaretakerProfile>;

    let accessToken: string;
    let userId: string;

    const testEmail = `test-users-${Date.now()}@test.com`;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
        app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
        await app.init();

        userRepo = moduleFixture.get(getRepositoryToken(User));
        sessionRepo = moduleFixture.get(getRepositoryToken(Session));
        caretakerProfileRepo = moduleFixture.get(getRepositoryToken(CaretakerProfile));

        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: testEmail, password: 'password123' });
        accessToken = res.body.access_token;

        const meRes = await request(app.getHttpServer())
            .get('/auth/me')
            .set('Authorization', `Bearer ${accessToken}`);
        userId = meRes.body.id;
    });

    afterAll(async () => {
        await caretakerProfileRepo.delete({ userId });
        await sessionRepo.delete({ userId });
        await userRepo.delete({ id: userId });
        await app.close();
    });

    describe('GET /users/:id', () => {
        it('should return public profile without sensitive fields', async () => {
            const res = await request(app.getHttpServer())
                .get(`/users/${userId}`)
                .expect(200);

            expect(res.body.id).toBe(userId);
            expect(res.body.email).toBe(testEmail);
            expect(res.body.passwordHash).toBeUndefined();
            expect(res.body.refreshTokenHash).toBeUndefined();
        });

        it('should return 404 for non-existent user', async () => {
            await request(app.getHttpServer())
                .get('/users/00000000-0000-0000-0000-000000000000')
                .expect(404);
        });
    });

    describe('PATCH /users/me', () => {
        it('should update my profile fields', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/users/me`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    firstName: 'Testfirst',
                    lastName: 'Testlast',
                    phone: '+380999999999'
                })
                .expect(200);

            expect(res.body.id).toBe(userId);
            expect(res.body.firstName).toBe('Testfirst');
            expect(res.body.lastName).toBe('Testlast');
            expect(res.body.phone).toBe('+380999999999');
            expect(res.body.avatarUrl).toBe(null);
        })

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .patch(`/users/me`)
                .send({
                    firstName: 'Testfirst',
                    lastName: 'Testlast',
                })
                .expect(401);
        })

        it('should return 400 for not valid field', async()=>{
            await request(app.getHttpServer())
                .patch(`/users/me`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    secondName: 'Notvalidname'
                })
                .expect(400);

        })
    });

    describe('POST /users/me/caretaker-profile', () => {
        it('should create caretaker profile', async () => {
            const res = await request(app.getHttpServer())
                .post('/users/me/caretaker-profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    bio: 'Люблю тварин',
                    experienceYears: 3,
                    hourlyRate: 150,
                    serviceTypes: [ServiceType.WALKING, ServiceType.PET_SITTING],
                    serviceLatitude: 50.45,
                    serviceLongitude: 30.52,
                    radiusKm: 5,
                })
                .expect(201);

            expect(res.body.userId).toBe(userId);
            expect(res.body.bio).toBe('Люблю тварин');
            expect(res.body.isVerified).toBe(false);
            expect(res.body.serviceTypes).toContain(ServiceType.WALKING);
        });

        it('should return 409 if profile already exists', async () => {
            await request(app.getHttpServer())
                .post('/users/me/caretaker-profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ bio: 'Дублікат' })
                .expect(409);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .post('/users/me/caretaker-profile')
                .send({ bio: 'Test' })
                .expect(401);
        });

        it('should return 400 for invalid coordinates', async () => {
            await request(app.getHttpServer())
                .post('/users/me/caretaker-profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ serviceLatitude: 999 })
                .expect(400);
        });
    });

    describe('PATCH /users/me/caretaker-profile', () => {
        it('should update caretaker profile fields', async () => {
            const res = await request(app.getHttpServer())
                .patch('/users/me/caretaker-profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ bio: 'Оновлено', hourlyRate: 200 })
                .expect(200);

            expect(res.body.bio).toBe('Оновлено');
            expect(Number(res.body.hourlyRate)).toBe(200);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .patch('/users/me/caretaker-profile')
                .send({ bio: 'Test' })
                .expect(401);
        });
    });
});
