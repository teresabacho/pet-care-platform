import { apiClient } from './api'
import type { ServiceType } from '@pet-care/shared'
import type { UserPublic, CaretakerProfile } from '../types'

interface UpdateUserDto {
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string
}

interface CaretakerProfileDto {
  bio?: string
  experienceYears?: number
  hourlyRate?: number
  serviceTypes?: ServiceType[]
  serviceLatitude?: number
  serviceLongitude?: number
  radiusKm?: number
}

export const usersService = {
  async getById(id: string): Promise<UserPublic> {
    const { data } = await apiClient.get<UserPublic>(`/users/${id}`)
    return data
  },

  async updateMe(dto: UpdateUserDto): Promise<UserPublic> {
    const { data } = await apiClient.patch<UserPublic>('/users/me', dto)
    return data
  },

  async createCaretakerProfile(dto: CaretakerProfileDto): Promise<CaretakerProfile> {
    const { data } = await apiClient.post<CaretakerProfile>('/users/me/caretaker-profile', dto)
    return data
  },

  async updateCaretakerProfile(dto: CaretakerProfileDto): Promise<CaretakerProfile> {
    const { data } = await apiClient.patch<CaretakerProfile>('/users/me/caretaker-profile', dto)
    return data
  },
}