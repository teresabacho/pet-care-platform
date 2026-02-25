import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { Session } from '../src/modules/auth/entities/session.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
    let app: INestApplication;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let createdUserId: string;

    const testEmail = `test-auth-${Date.now()}@test.com`;
    const testPassword = 'password123';

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
    });

    afterAll(async () => {
        if (createdUserId) {
            await sessionRepo.delete({ userId: createdUserId });
            await userRepo.delete({ id: createdUserId });
        }
        await app.close();
    });

    describe('POST /auth/register', () => {
        it('should register a new user and return tokens', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email: testEmail, password: testPassword })
                .expect(201);

            expect(res.body.access_token).toBeDefined();
            expect(res.body.refresh_token).toBeDefined();

            const meRes = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${res.body.access_token}`);
            createdUserId = meRes.body.id;
        });

        it('should return 409 for duplicate email', async () => {
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email: testEmail, password: testPassword })
                .expect(409);
        });

        it('should return 400 for invalid data (short password, bad email)', async () => {
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({ email: 'not-an-email', password: '123' })
                .expect(400);
        });
    });

    describe('POST /auth/login', () => {
        it('should return tokens for valid credentials', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: testEmail, password: testPassword })
                .expect(201);

            expect(res.body.access_token).toBeDefined();
            expect(res.body.refresh_token).toBeDefined();
        });

        it('should return 401 for wrong password', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: testEmail, password: 'wrongpassword' })
                .expect(401);
        });

        it('should return 401 for non-existent email', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'nobody@example.com', password: testPassword })
                .expect(401);
        });
    });

    describe('GET /auth/me', () => {
        it('should return current user without sensitive fields', async () => {
            const loginRes = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: testEmail, password: testPassword });

            const res = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${loginRes.body.access_token}`)
                .expect(200);

            expect(res.body.email).toBe(testEmail);
            expect(res.body.passwordHash).toBeUndefined();
            expect(res.body.refreshTokenHash).toBeUndefined();
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer()).get('/auth/me').expect(401);
        });
    });

    describe('POST /auth/refresh', () => {
        it('should return new tokens with valid refresh token', async () => {
            const loginRes = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: testEmail, password: testPassword });

            const res = await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refresh_token: loginRes.body.refresh_token })
                .expect(201);

            expect(res.body.access_token).toBeDefined();
            expect(res.body.refresh_token).toBeDefined();
        });

        it('should return 401 for invalid refresh token', async () => {
            await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refresh_token: 'invalid.token.value' })
                .expect(401);
        });
    });
});
