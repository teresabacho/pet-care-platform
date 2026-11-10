import axios from 'axios'
import { apiClient } from './api'
import type { MediaItem } from '../types'
import { MediaType, type MediaOwnerType } from '@pet-care/shared'

interface PresignedUploadResponse {
  mediaItem: MediaItem
  uploadUrl: string
}

export const mediaService = {
  /**
   * Завантаження зображення через бекенд (sharp-обробка → MinIO).
   * Викликається для аватарів, галерей, фото відгуків.
   */
  async uploadImage(
    file: File,
    ownerType: MediaOwnerType,
    ownerId: string,
    onProgress?: (percent: number) => void,
  ): Promise<MediaItem> {
    const form = new FormData()
    form.append('file', file)
    form.append('ownerType', ownerType)
    form.append('ownerId', ownerId)

    const { data } = await apiClient.post<MediaItem>('/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
    return data
  },

  /**
   * Триетапний потік для відео: запит presigned URL → PUT напряму в MinIO →
   * confirm повідомляє бекенд що файл на місці.
   */
  async uploadVideo(
    file: File,
    ownerType: MediaOwnerType,
    ownerId: string,
    onProgress?: (percent: number) => void,
  ): Promise<MediaItem> {
    const presigned = await apiClient.post<PresignedUploadResponse>(
      '/media/presigned-upload',
      {
        ownerType,
        ownerId,
        mediaType: MediaType.VIDEO,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    )

    await axios.put(presigned.data.uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    const { data } = await apiClient.post<MediaItem>(
      `/media/${presigned.data.mediaItem.id}/confirm`,
    )
    return data
  },

  /**
   * Для приватних файлів (повідомлень) URL живе 1 годину; компонент
   * має кешувати в стейті і перезапитувати на 401.
   */
  async getPresignedDownloadUrl(
    mediaItemId: string,
  ): Promise<{ url: string; expiresAt: string }> {
    const { data } = await apiClient.get<{ url: string; expiresAt: string }>(
      `/media/${mediaItemId}/presigned-url`,
    )
    return data
  },

  async delete(mediaItemId: string): Promise<void> {
    await apiClient.delete(`/media/${mediaItemId}`)
  },

  async deleteOwnUserAvatar(): Promise<void> {
    await apiClient.delete('/media/avatar/user/me')
  },

  async deletePetAvatar(petId: string): Promise<void> {
    await apiClient.delete(`/media/avatar/pet/${petId}`)
  },

  async listForOwner(
    ownerType: MediaOwnerType,
    ownerId: string,
  ): Promise<MediaItem[]> {
    const { data } = await apiClient.get<MediaItem[]>('/media', {
      params: { ownerType, ownerId },
    })
    return data
  },

  async reorder(
    ownerType: MediaOwnerType,
    ownerId: string,
    ids: string[],
  ): Promise<MediaItem[]> {
    const { data } = await apiClient.patch<MediaItem[]>('/media/reorder', {
      ownerType,
      ownerId,
      ids,
    })
    return data
  },
}
