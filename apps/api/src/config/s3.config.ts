import { registerAs } from '@nestjs/config';

export interface S3Config {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  publicBucket: string;
  privateBucket: string;
  publicUrlBase: string;
  forcePathStyle: boolean;
  presignedUploadTtlSeconds: number;
  presignedDownloadTtlSeconds: number;
}

export default registerAs<S3Config>('s3', () => ({
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.S3_REGION ?? 'us-east-1',
  accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
  secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
  publicBucket: process.env.S3_PUBLIC_BUCKET ?? 'pet-care-public',
  privateBucket: process.env.S3_PRIVATE_BUCKET ?? 'pet-care-private',
  publicUrlBase:
    process.env.S3_PUBLIC_URL_BASE ?? 'http://localhost:9000/pet-care-public',
  forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  presignedUploadTtlSeconds: Number(
    process.env.PRESIGNED_UPLOAD_TTL_SECONDS ?? 900,
  ),
  presignedDownloadTtlSeconds: Number(
    process.env.PRESIGNED_DOWNLOAD_TTL_SECONDS ?? 3600,
  ),
}));
