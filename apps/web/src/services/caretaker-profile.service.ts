import { apiClient } from './api'
import type {
  CaretakerSkill,
  Language,
  ServiceType,
} from '@pet-care/shared'
import type { CaretakerProfile, User } from '../types'

interface CreateCaretakerProfileDto {
  bio?: string
  experienceYears?: number
  hourlyRate?: number
  serviceTypes?: ServiceType[]
  skills?: CaretakerSkill[]
  languages?: Language[]
  addressIsPublic?: boolean
  serviceLatitude?: number
  serviceLongitude?: number
  radiusKm?: number
  country?: string
  city?: string
  street?: string
  apartment?: string
  floor?: string
  entrance?: string
}

type UpdateCaretakerProfileDto = CreateCaretakerProfileDto

export const caretakerProfileService = {
  // Бекенд повертає юзера з вкладеним caretakerProfile (relation 'caretakerProfile').
  async getMyCaretakerProfile(): Promise<CaretakerProfile | null> {
    const { data } = await apiClient.get<User>('/auth/me')
    return data.caretakerProfile ?? null
  },

  async createCaretakerProfile(dto: CreateCaretakerProfileDto): Promise<CaretakerProfile> {
    const { data } = await apiClient.post<CaretakerProfile>('/users/me/caretaker-profile', dto)
    return data
  },

  async updateCaretakerProfile(dto: UpdateCaretakerProfileDto): Promise<CaretakerProfile> {
    const { data } = await apiClient.patch<CaretakerProfile>('/users/me/caretaker-profile', dto)
    return data
  },
}
