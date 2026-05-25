import { registerAs } from '@nestjs/config';

export interface MediaLimitsConfig {
  maxAvatarBytes: number;
  maxGalleryImageBytes: number;
  maxGalleryVideoBytes: number;
  maxReviewImageBytes: number;
  maxMessageImageBytes: number;
  maxMessageVideoBytes: number;
  maxMessageDocBytes: number;
  maxCertificateBytes: number;
  maxCaretakerGalleryItems: number;
  maxPetGalleryItems: number;
  maxReviewPhotos: number;
  maxMessageAttachments: number;
  maxCaretakerCertificates: number;
}

export default registerAs<MediaLimitsConfig>('mediaLimits', () => ({
  maxAvatarBytes: Number(process.env.MEDIA_MAX_AVATAR_BYTES ?? 5_242_880),
  maxGalleryImageBytes: Number(
    process.env.MEDIA_MAX_GALLERY_IMAGE_BYTES ?? 10_485_760,
  ),
  maxGalleryVideoBytes: Number(
    process.env.MEDIA_MAX_GALLERY_VIDEO_BYTES ?? 78_643_200,
  ),
  maxReviewImageBytes: Number(
    process.env.MEDIA_MAX_REVIEW_IMAGE_BYTES ?? 5_242_880,
  ),
  maxMessageImageBytes: Number(
    process.env.MEDIA_MAX_MESSAGE_IMAGE_BYTES ?? 10_485_760,
  ),
  maxMessageVideoBytes: Number(
    process.env.MEDIA_MAX_MESSAGE_VIDEO_BYTES ?? 104_857_600,
  ),
  maxMessageDocBytes: Number(
    process.env.MEDIA_MAX_MESSAGE_DOC_BYTES ?? 20_971_520,
  ),
  maxCertificateBytes: Number(
    process.env.MEDIA_MAX_CERTIFICATE_BYTES ?? 20_971_520,
  ),
  maxCaretakerGalleryItems: 20,
  maxPetGalleryItems: 10,
  maxReviewPhotos: 5,
  maxMessageAttachments: 5,
  maxCaretakerCertificates: 10,
}));
