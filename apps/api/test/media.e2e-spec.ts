import {
    ClassSerializerInterceptor,
    INestApplication,
    ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import * as sharp from 'sharp';
import { Repository } from 'typeorm';
import {
    MediaItemStatus,
    MediaOwnerType,
    MediaType,
} from '@pet-care/shared';
import { Session } from '../src/modules/auth/entities/session.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { Pet } from '../src/modules/pets/entities/pet.entity';
import { MediaItem } from '../src/modules/media/entities/media-item.entity';
import { StorageService } from '../src/modules/storage/storage.service';
import { AppModule } from '../src/app.module';

describe('Media (e2e)', () => {
    let app: INestApplication;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let petRepo: Repository<Pet>;
    let mediaRepo: Repository<MediaItem>;
    let storage: StorageService;

    let ownerToken: string;
    let otherToken: string;
    let ownerId: string;
    let otherId: string;
    let petId: string;

    const ownerEmail = `test-media-owner-${Date.now()}@test.com`;
    const otherEmail = `test-media-other-${Date.now()}@test.com`;

    const buildJpeg = async (w = 800, h = 600): Promise<Buffer> =>
        sharp({
            create: {
                width: w,
                height: h,
                channels: 3,
                background: { r: 50, g: 100, b: 150 },
            },
        })
            .jpeg()
            .toBuffer();

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
        );
        app.useGlobalInterceptors(
            new ClassSerializerInterceptor(app.get(Reflector)),
        );
        await app.init();

        userRepo = moduleFixture.get(getRepositoryToken(User));
        sessionRepo = moduleFixture.get(getRepositoryToken(Session));
        petRepo = moduleFixture.get(getRepositoryToken(Pet));
        mediaRepo = moduleFixture.get(getRepositoryToken(MediaItem));
        storage = moduleFixture.get(StorageService);

        const ownerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: ownerEmail, password: 'password123' });
        ownerToken = ownerRes.body.access_token;

        const otherRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: otherEmail, password: 'password123' });
        otherToken = otherRes.body.access_token;

        ownerId = (
            await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${ownerToken}`)
        ).body.id;
        otherId = (
            await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${otherToken}`)
        ).body.id;

        const petRes = await request(app.getHttpServer())
            .post('/pets')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ name: 'Тестовий', species: 'Cat' });
        petId = petRes.body.id;
    }, 30000);

    afterAll(async () => {
        // Clean up media rows + storage objects we own
        const items = await mediaRepo.find({ where: { uploadedById: ownerId } });
        for (const item of items) {
            await storage
                .deleteObject(
                    item.bucket === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
                    item.storageKey,
                )
                .catch(() => undefined);
            if (item.thumbnailKey) {
                await storage
                    .deleteObject(
                        item.bucket === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
                        item.thumbnailKey,
                    )
                    .catch(() => undefined);
            }
            await mediaRepo.delete(item.id).catch(() => undefined);
        }
        await petRepo.delete({ ownerId });
        await sessionRepo.delete({ userId: ownerId });
        await sessionRepo.delete({ userId: otherId });
        await userRepo.delete({ id: ownerId });
        await userRepo.delete({ id: otherId });
        await app.close();
    });

    describe('POST /media/upload', () => {
        it('returns 401 without token', async () => {
            const buf = await buildJpeg();
            await request(app.getHttpServer())
                .post('/media/upload')
                .field('ownerType', MediaOwnerType.USER_AVATAR)
                .field('ownerId', ownerId)
                .attach('file', buf, { filename: 'a.jpg', contentType: 'image/jpeg' })
                .expect(401);
        });

        it('uploads avatar and updates User.avatarUrl', async () => {
            const buf = await buildJpeg();
            const res = await request(app.getHttpServer())
                .post('/media/upload')
                .set('Authorization', `Bearer ${ownerToken}`)
                .field('ownerType', MediaOwnerType.USER_AVATAR)
                .field('ownerId', ownerId)
                .attach('file', buf, {
                    filename: 'avatar.jpg',
                    contentType: 'image/jpeg',
                })
                .expect(201);

            expect(res.body.url).toContain('avatars/users/');
            expect(res.body.status).toBe(MediaItemStatus.READY);
            expect(res.body.mediaType).toBe(MediaType.IMAGE);
            expect(res.body.width).toBe(400);
            expect(res.body.height).toBe(400);

            const me = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(me.body.avatarUrl).toBe(res.body.url);

            const exists = await storage.objectExists('PUBLIC', res.body.storageKey);
            expect(exists).toBe(true);
        });

        it('replaces avatar — deletes the previous one', async () => {
            const first = await request(app.getHttpServer())
                .post('/media/upload')
                .set('Authorization', `Bearer ${ownerToken}`)
                .field('ownerType', MediaOwnerType.PET_AVATAR)
                .field('ownerId', petId)
                .attach('file', await buildJpeg(), {
                    filename: '1.jpg',
                    contentType: 'image/jpeg',
                })
                .expect(201);
            const firstKey = first.body.storageKey;

            const second = await request(app.getHttpServer())
                .post('/media/upload')
                .set('Authorization', `Bearer ${ownerToken}`)
                .field('ownerType', MediaOwnerType.PET_AVATAR)
                .field('ownerId', petId)
                .attach('file', await buildJpeg(1000, 800), {
                    filename: '2.jpg',
                    contentType: 'image/jpeg',
                })
                .expect(201);
            expect(second.body.storageKey).not.toBe(firstKey);

            const oldRow = await mediaRepo.findOne({ where: { id: first.body.id } });
            expect(oldRow?.status).toBe(MediaItemStatus.DELETED);
            const oldExists = await storage.objectExists('PUBLIC', firstKey);
            expect(oldExists).toBe(false);
        });

        it('returns 403 when uploading avatar of another user', async () => {
            await request(app.getHttpServer())
                .post('/media/upload')
                .set('Authorization', `Bearer ${otherToken}`)
                .field('ownerType', MediaOwnerType.USER_AVATAR)
                .field('ownerId', ownerId)
                .attach('file', await buildJpeg(), {
                    filename: 'a.jpg',
                    contentType: 'image/jpeg',
                })
                .expect(403);
        });

        it('returns 400 for unsupported mime', async () => {
            await request(app.getHttpServer())
                .post('/media/upload')
                .set('Authorization', `Bearer ${ownerToken}`)
                .field('ownerType', MediaOwnerType.USER_AVATAR)
                .field('ownerId', ownerId)
                .attach('file', Buffer.from('garbage'), {
                    filename: 'a.gif',
                    contentType: 'image/gif',
                })
                .expect(400);
        });

        it('enforces gallery max-count for PET_GALLERY', async () => {
            // Limit is 10 — try to upload 11
            for (let i = 0; i < 10; i++) {
                await request(app.getHttpServer())
                    .post('/media/upload')
                    .set('Authorization', `Bearer ${ownerToken}`)
                    .field('ownerType', MediaOwnerType.PET_GALLERY)
                    .field('ownerId', petId)
                    .attach('file', await buildJpeg(), {
                        filename: `g${i}.jpg`,
                        contentType: 'image/jpeg',
                    })
                    .expect(201);
            }
            await request(app.getHttpServer())
                .post('/media/upload')
                .set('Authorization', `Bearer ${ownerToken}`)
                .field('ownerType', MediaOwnerType.PET_GALLERY)
                .field('ownerId', petId)
                .attach('file', await buildJpeg(), {
                    filename: 'overflow.jpg',
                    contentType: 'image/jpeg',
                })
                .expect(409);
        }, 60000);
    });

    describe('POST /media/presigned-upload + confirm', () => {
        let presignedPetId: string;

        beforeAll(async () => {
            // Окрема тварина — попередній тест мiг заповнити галерею до ліміту
            const res = await request(app.getHttpServer())
                .post('/pets')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ name: 'Презайнед', species: 'Dog' });
            presignedPetId = res.body.id;
        });

        it('rejects confirm before upload (object missing)', async () => {
            const presigned = await request(app.getHttpServer())
                .post('/media/presigned-upload')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    ownerType: MediaOwnerType.PET_GALLERY,
                    ownerId: presignedPetId,
                    mediaType: MediaType.VIDEO,
                    mimeType: 'video/mp4',
                    sizeBytes: 1024,
                })
                .expect(201);

            expect(presigned.body.uploadUrl).toContain('http');
            expect(presigned.body.mediaItem.status).toBe(MediaItemStatus.PENDING);

            await request(app.getHttpServer())
                .post(`/media/${presigned.body.mediaItem.id}/confirm`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(400);
        });

        it('rejects video presigned for non-video mime', async () => {
            await request(app.getHttpServer())
                .post('/media/presigned-upload')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                    ownerType: MediaOwnerType.PET_GALLERY,
                    ownerId: presignedPetId,
                    mediaType: MediaType.VIDEO,
                    mimeType: 'image/png',
                    sizeBytes: 1024,
                })
                .expect(400);
        });
    });

    describe('DELETE /media/:id', () => {
        it('deletes own media and removes the storage object', async () => {
            const upload = await request(app.getHttpServer())
                .post('/media/upload')
                .set('Authorization', `Bearer ${ownerToken}`)
                .field('ownerType', MediaOwnerType.USER_AVATAR)
                .field('ownerId', ownerId)
                .attach('file', await buildJpeg(), {
                    filename: 'd.jpg',
                    contentType: 'image/jpeg',
                })
                .expect(201);

            const id = upload.body.id;
            const key = upload.body.storageKey;

            await request(app.getHttpServer())
                .delete(`/media/${id}`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(204);

            const exists = await storage.objectExists('PUBLIC', key);
            expect(exists).toBe(false);
            const row = await mediaRepo.findOne({ where: { id } });
            expect(row?.status).toBe(MediaItemStatus.DELETED);
        });

        it('returns 404 for unknown id', async () => {
            await request(app.getHttpServer())
                .delete('/media/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${ownerToken}`)
                .expect(404);
        });
    });
});
