import { BadRequestException, Injectable } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ProcessedImage {
    buffer: Buffer;
    width: number;
    height: number;
    mimeType: 'image/webp';
}

export interface ProcessedGalleryImage {
    main: ProcessedImage;
    thumbnail: ProcessedImage;
}

const ALLOWED_INPUT_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

@Injectable()
export class ImageProcessor {
    async validateImage(buffer: Buffer, mimeType: string): Promise<void> {
        if (!ALLOWED_INPUT_MIME.has(mimeType)) {
            throw new BadRequestException(
                `Unsupported image MIME: ${mimeType}`,
            );
        }
        try {
            const meta = await sharp(buffer).metadata();
            if (!meta.width || !meta.height) {
                throw new Error('image has no dimensions');
            }
        } catch (err) {
            throw new BadRequestException(
                `Invalid image file: ${(err as Error).message}`,
            );
        }
    }

    async processAvatar(buffer: Buffer): Promise<ProcessedImage> {
        const out = await sharp(buffer)
            .rotate()
            .resize(400, 400, { fit: 'cover', position: 'center' })
            .webp({ quality: 85 })
            .toBuffer({ resolveWithObject: true });

        return {
            buffer: out.data,
            width: out.info.width,
            height: out.info.height,
            mimeType: 'image/webp',
        };
    }

    async processGalleryImage(buffer: Buffer): Promise<ProcessedGalleryImage> {
        return this.processWithThumbnail(buffer, 85);
    }

    async processReviewPhoto(buffer: Buffer): Promise<ProcessedGalleryImage> {
        return this.processWithThumbnail(buffer, 85);
    }

    async processMessageImage(buffer: Buffer): Promise<ProcessedGalleryImage> {
        return this.processWithThumbnail(buffer, 80);
    }

    private async processWithThumbnail(
        buffer: Buffer,
        quality: number,
    ): Promise<ProcessedGalleryImage> {
        const main = await sharp(buffer)
            .rotate()
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality })
            .toBuffer({ resolveWithObject: true });

        const thumb = await sharp(buffer)
            .rotate()
            .resize(400, 400, { fit: 'cover', position: 'center' })
            .webp({ quality })
            .toBuffer({ resolveWithObject: true });

        return {
            main: {
                buffer: main.data,
                width: main.info.width,
                height: main.info.height,
                mimeType: 'image/webp',
            },
            thumbnail: {
                buffer: thumb.data,
                width: thumb.info.width,
                height: thumb.info.height,
                mimeType: 'image/webp',
            },
        };
    }
}
