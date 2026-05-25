import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { Session } from '../src/modules/auth/entities/session.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { CaretakerProfile } from '../src/modules/users/entities/caretaker-profile.entity';
import { Certificate } from '../src/modules/users/certificates/entities/certificate.entity';
import { MediaItem } from '../src/modules/media/entities/media-item.entity';
import { AppModule } from '../src/app.module';
import {
    CertificateType,
    MediaBucket,
    MediaItemStatus,
    MediaOwnerType,
    MediaType,
} from '@pet-care/shared';

describe('Certificates (e2e)', () => {
    let app: INestApplication;
    let userRepo: Repository<User>;
    let sessionRepo: Repository<Session>;
    let profileRepo: Repository<CaretakerProfile>;
    let certRepo: Repository<Certificate>;
    let mediaRepo: Repository<MediaItem>;

    let caretakerToken: string;
    let otherToken: string;
    let caretakerId: string;
    let otherId: string;
    let caretakerProfileId: string;

    const caretakerEmail = `test-certs-caretaker-${Date.now()}@test.com`;
    const otherEmail = `test-certs-other-${Date.now()}@test.com`;

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
        certRepo = moduleFixture.get(getRepositoryToken(Certificate));
        mediaRepo = moduleFixture.get(getRepositoryToken(MediaItem));

        const r1 = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: caretakerEmail, password: 'password123' });
        caretakerToken = r1.body.access_token;

        const r2 = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: otherEmail, password: 'password123' });
        otherToken = r2.body.access_token;

        const me1 = await request(app.getHttpServer())
            .get('/auth/me').set('Authorization', `Bearer ${caretakerToken}`);
        caretakerId = me1.body.id;

        const me2 = await request(app.getHttpServer())
            .get('/auth/me').set('Authorization', `Bearer ${otherToken}`);
        otherId = me2.body.id;

        const profile = await request(app.getHttpServer())
            .post('/users/me/caretaker-profile')
            .set('Authorization', `Bearer ${caretakerToken}`)
            .send({ bio: 'Test' });
        caretakerProfileId = profile.body.id;
    });

    afterAll(async () => {
        await certRepo.delete({ caretakerProfileId });
        await mediaRepo.delete({ ownerType: MediaOwnerType.CARETAKER_CERTIFICATE, ownerId: caretakerProfileId });
        await profileRepo.delete({ id: caretakerProfileId });
        await sessionRepo.delete({ userId: caretakerId });
        await sessionRepo.delete({ userId: otherId });
        await userRepo.delete({ id: caretakerId });
        await userRepo.delete({ id: otherId });
        await app.close();
    });

    // Допоміжна функція: створює MediaItem READY напряму, минаючи S3 upload —
    // тести сертифіката тестують тільки логіку Certificate, не sharp/MinIO.
    async function insertReadyMediaItem(uploaderId: string): Promise<MediaItem> {
        return mediaRepo.save(
            mediaRepo.create({
                ownerType: MediaOwnerType.CARETAKER_CERTIFICATE,
                ownerId: caretakerProfileId,
                bucket: MediaBucket.PUBLIC,
                storageKey: `certificates/${caretakerProfileId}/${Date.now()}.pdf`,
                url: `http://localhost:9000/pet-care-public/certificates/${caretakerProfileId}/${Date.now()}.pdf`,
                thumbnailKey: null,
                thumbnailUrl: null,
                mediaType: MediaType.DOCUMENT,
                mimeType: 'application/pdf',
                sizeBytes: 1024,
                width: null,
                height: null,
                durationSeconds: null,
                status: MediaItemStatus.READY,
                orderIndex: 0,
                uploadedById: uploaderId,
            }),
        );
    }

    describe('POST /caretaker-profile/certificates', () => {
        it('створює сертифікат з валідним MediaItem-ом', async () => {
            const media = await insertReadyMediaItem(caretakerId);
            const res = await request(app.getHttpServer())
                .post('/caretaker-profile/certificates')
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({
                    type: CertificateType.VET_DEGREE,
                    title: 'Диплом ветеринара',
                    mediaItemId: media.id,
                })
                .expect(201);

            expect(res.body.type).toBe(CertificateType.VET_DEGREE);
            expect(res.body.title).toBe('Диплом ветеринара');
            expect(res.body.mediaItemId).toBe(media.id);
        });

        it('повертає 403, якщо MediaItem завантажений іншим користувачем', async () => {
            const media = await insertReadyMediaItem(otherId);
            await request(app.getHttpServer())
                .post('/caretaker-profile/certificates')
                .set('Authorization', `Bearer ${caretakerToken}`)
                .send({
                    type: CertificateType.OTHER,
                    title: 'Чужий файл',
                    mediaItemId: media.id,
                })
                .expect(403);
        });
    });

    describe('GET /caretaker-profile/:id/certificates', () => {
        it('повертає список сертифікатів caretaker-а (публічний)', async () => {
            const res = await request(app.getHttpServer())
                .get(`/caretaker-profile/${caretakerProfileId}/certificates`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('DELETE /caretaker-profile/certificates/:id', () => {
        it('повертає 403 при спробі видалити чужий', async () => {
            const list = await request(app.getHttpServer())
                .get(`/caretaker-profile/${caretakerProfileId}/certificates`);
            const id = list.body[0].id;

            await request(app.getHttpServer())
                .delete(`/caretaker-profile/certificates/${id}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(403);
        });

        it('видаляє сертифікат і пов\'язаний MediaItem', async () => {
            const list = await request(app.getHttpServer())
                .get(`/caretaker-profile/${caretakerProfileId}/certificates`);
            const cert = list.body[0];

            await request(app.getHttpServer())
                .delete(`/caretaker-profile/certificates/${cert.id}`)
                .set('Authorization', `Bearer ${caretakerToken}`)
                .expect(204);

            // Certificate-рядок зник
            expect(await certRepo.findOne({ where: { id: cert.id } })).toBeNull();
            // MediaItem soft-deleted (status = DELETED), або hard-deleted — приймаємо обидва варіанти
            const media = await mediaRepo.findOne({ where: { id: cert.mediaItemId } });
            if (media) {
                expect(media.status).toBe(MediaItemStatus.DELETED);
            }
        });
    });
});
