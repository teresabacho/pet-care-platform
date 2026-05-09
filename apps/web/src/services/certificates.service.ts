import { apiClient } from './api'
import type { Certificate } from '../types'
import type { CertificateType } from '@pet-care/shared'

export interface CreateCertificateDto {
  type: CertificateType
  title: string
  mediaItemId: string
}

export const certificatesService = {
  async getByCaretakerProfile(
    caretakerProfileId: string,
  ): Promise<Certificate[]> {
    const { data } = await apiClient.get<Certificate[]>(
      `/caretaker-profile/${caretakerProfileId}/certificates`,
    )
    return data
  },

  async create(dto: CreateCertificateDto): Promise<Certificate> {
    const { data } = await apiClient.post<Certificate>(
      '/caretaker-profile/certificates',
      dto,
    )
    return data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/caretaker-profile/certificates/${id}`)
  },
}
