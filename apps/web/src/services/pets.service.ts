import { apiClient } from './api'
import type { Pet, PetDetails } from '../types'

interface CreatePetDto {
  name: string
  species?: string
  breed?: string
  age?: number
  ageMonths?: number
  weight?: number
  sex?: string
  neutered?: string
  dateAcquired?: string
  description?: string
  photoUrl?: string
  specialNeeds?: string
  details?: PetDetails
}

export const petsService = {
  async getMyPets(): Promise<Pet[]> {
    const { data } = await apiClient.get<Pet[]>('/pets')
    return data
  },

  async getById(id: string): Promise<Pet> {
    const { data } = await apiClient.get<Pet>(`/pets/${id}`)
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