import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { S3Config } from '../../config/s3.config';
import type {
  S3BucketKind,
  UploadResult,
} from './interfaces/upload-result.interface';

@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly cfg: S3Config;

  constructor(private readonly configService: ConfigService) {
    const cfg = this.configService.get<S3Config>('s3');
    if (!cfg) {
      throw new Error('S3 config is not registered');
    }
    this.cfg = cfg;

    this.client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKey,
        secretAccessKey: cfg.secretKey,
      },
      forcePathStyle: cfg.forcePathStyle,
    });
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  resolveBucket(kind: S3BucketKind): string {
    return kind === 'PUBLIC' ? this.cfg.publicBucket : this.cfg.privateBucket;
  }

  publicUrl(key: string): string {
    return `${this.cfg.publicUrlBase}/${key}`;
  }

  async uploadBuffer(
    kind: S3BucketKind,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    const bucket = this.resolveBucket(kind);
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return {
      bucket,
      key,
      url: kind === 'PUBLIC' ? this.publicUrl(key) : `s3://${bucket}/${key}`,
    };
  }

  async deleteObject(kind: S3BucketKind, key: string): Promise<void> {
    const bucket = this.resolveBucket(kind);
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(
        `deleteObject failed for ${bucket}/${key}: ${(err as Error).message}`,
      );
    }
  }

  async deleteByPrefix(kind: S3BucketKind, prefix: string): Promise<number> {
    const bucket = this.resolveBucket(kind);
    let deleted = 0;
    let continuationToken: string | undefined;

    do {
      const list = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      const contents = list.Contents ?? [];
      if (contents.length > 0) {
        const objects = contents
          .map((o) => (o.Key ? { Key: o.Key } : null))
          .filter((o): o is { Key: string } => o !== null);
        for (let i = 0; i < objects.length; i += 1000) {
          const batch = objects.slice(i, i + 1000);
          await this.client.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: { Objects: batch, Quiet: true },
            }),
          );
          deleted += batch.length;
        }
      }
      continuationToken = list.IsTruncated
        ? list.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return deleted;
  }

  async getPresignedUploadUrl(
    kind: S3BucketKind,
    key: string,
    contentType: string,
    ttlSeconds = this.cfg.presignedUploadTtlSeconds,
  ): Promise<string> {
    const bucket = this.resolveBucket(kind);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: ttlSeconds });
  }

  async getPresignedDownloadUrl(
    kind: S3BucketKind,
    key: string,
    ttlSeconds = this.cfg.presignedDownloadTtlSeconds,
  ): Promise<string> {
    const bucket = this.resolveBucket(kind);
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: ttlSeconds });
  }

  async objectExists(kind: S3BucketKind, key: string): Promise<boolean> {
    const bucket = this.resolveBucket(kind);
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return true;
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status === 404 || status === 403) {
        return false;
      }
      throw err;
    }
  }

  async headObjectSize(
    kind: S3BucketKind,
    key: string,
  ): Promise<number | null> {
    const bucket = this.resolveBucket(kind);
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return res.ContentLength ?? null;
    } catch {
      return null;
    }
  }

  async *listAllKeys(
    kind: S3BucketKind,
    prefix?: string,
  ): AsyncGenerator<string, void, unknown> {
    const bucket = this.resolveBucket(kind);
    let continuationToken: string | undefined;
    do {
      const list = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of list.Contents ?? []) {
        if (obj.Key) yield obj.Key;
      }
      continuationToken = list.IsTruncated
        ? list.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }
}
