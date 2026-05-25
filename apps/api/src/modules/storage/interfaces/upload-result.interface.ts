export type S3BucketKind = 'PUBLIC' | 'PRIVATE';

export interface UploadResult {
  bucket: string;
  key: string;
  url: string;
}
