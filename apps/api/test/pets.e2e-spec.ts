import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { Session } from '../src/modules/auth/entities/session.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { Pet } from '../src/modules/pets/entities/pet.entity';
import { AppModule } from '../src/app.module';

describe('Pets (e2e)', () => {
    let app: INestApplication;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let petRepo: Repository<Pet>;

    let ownerToken: string;
    let otherToken: string;
    let ownerId: string;
    let otherId: string;
    let createdPetId: string;

    const ownerEmail = `test-pets-owner-${Date.now()}@test.com`;
    const otherEmail = `test-pets-other-${Date.now()}@test.com`;

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
        petRepo = moduleFixture.get(getRepositoryToken(Pet));

        const ownerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: ownerEmail, password: 'password123' });
        ownerToken = ownerRes.body.access_token;

        const otherRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: otherEmail, password: 'password123' });
        otherToken = otherRes.body.access_token;

        const ownerMe = await request(app.getHttpServer())
            .get('/auth/me')
            .set('Authorization', `Bearer ${ownerToken}`);
        ownerId = ownerMe.body.id;

        const otherMe = await request(app.getHttpServer())
            .get('/auth/me')
            .set('Authorization', `Bearer ${otherToken}`);
        otherId = otherMe.body.id;
    });

    afterAll(async () => {
        await petRepo.delete({ ownerId });
        await sessionRepo.delete({ userId: ownerId });
        await sessionRepo.delete({ userId: otherId });
        await userRepo.delete({ id: ownerId });
        await userRepo.delete({ id: otherId });
        await app.close();
    });

    describe('POST /pets', () => {
        it('should create a pet', async () => {
            const res = await request(app.getHttpServer())
                .post('/pets')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    name: 'Барсик',
                    species: 'Кіт',
                    breed: 'Британська',
                    age: 3,
                    weight: 4.5,
                    specialNeeds: 'Алергія на курку',
                })
                .expect(201);

            expect(res.body.id).toBeDefined();
            expect(res.body.name).toBe('Барсик');
            expect(res.body.ownerId).toBe(ownerId);
            expect(res.body.isVerified).toBeUndefined();

            createdPetId = res.body.id;
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .post('/pets')
                .send({ name: 'Тест' })
                .expect(401);
        });

        it('should return 400 when name is missing', async () => {
            await request(app.getHttpServer())
                .post('/pets')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ species: 'Собака' })
                .expect(400);
        });
    });

    describe('GET /pets', () => {
        it('should return only my pets', async () => {
            const res = await request(app.getHttpServer())
                .get('/pets')
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            res.body.forEach((pet: { ownerId: string }) => {
                expect(pet.ownerId).toBe(ownerId);
            });
        });

        it('should return empty array for user with no pets', async () => {
            const res = await request(app.getHttpServer())
                .get('/pets')
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(200);

            expect(res.body).toEqual([]);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer()).get('/pets').expect(401);
        });
    });

    describe('GET /pets/:id', () => {
        it('should return pet by id', async () => {
            const res = await request(app.getHttpServer())
                .get(`/pets/${createdPetId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(200);

            expect(res.body.id).toBe(createdPetId);
            expect(res.body.name).toBe('Барсик');
        });

        it('should return 404 for non-existent pet', async () => {
            await request(app.getHttpServer())
                .get('/pets/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(404);
        });
    });

    describe('PATCH /pets/:id', () => {
        it('should update pet', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/pets/${createdPetId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ name: 'Барсик Оновлений', age: 4 })
                .expect(200);

            expect(res.body.name).toBe('Барсик Оновлений');
            expect(res.body.age).toBe(4);
        });

        it('should return 403 when another user tries to update', async () => {
            await request(app.getHttpServer())
                .patch(`/pets/${createdPetId}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send({ name: 'Чужий' })
                .expect(403);
        });

        it('should return 404 for non-existent pet', async () => {
            await request(app.getHttpServer())
                .patch('/pets/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ name: 'Test' })
                .expect(404);
        });
    });

    describe('DELETE /pets/:id', () => {
        it('should return 403 when another user tries to delete', async () => {
            await request(app.getHttpServer())
                .delete(`/pets/${createdPetId}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(403);
        });

        it('should delete pet', async () => {
            await request(app.getHttpServer())
                .delete(`/pets/${createdPetId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(204);
        });

        it('should return 404 after deletion', async () => {
            await request(app.getHttpServer())
                .get(`/pets/${createdPetId}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(404);
        });
    });
});
