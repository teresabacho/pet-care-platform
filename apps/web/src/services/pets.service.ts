import { apiClient } from './api'
import type { Pet } from '../types'

interface CreatePetDto {
  name: string
  species?: string
  breed?: string
  age?: number
  weight?: number
  description?: string
  photoUrl?: string
  specialNeeds?: string
}

export const petsService = {
  async getMyPets(): Promise<Pet[]> {
    const { data } = await apiClient.get<Pet[]>('/pets')
    return data
  },

  async create(dto: CreatePetDto): Promise<Pet> {
    const { data } = await apiClient.post<Pet>('/pets', dto)
    return data
  },

  async update(id: string, dto: Partial<CreatePetDto>): Promise<Pet> {
    const { data } = await apiClient.patch<Pet>(`/pets/${id}`, dto)
    return data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/pets/${id}`)
  },
}