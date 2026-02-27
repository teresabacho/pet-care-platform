import { apiClient } from './api'
import type { ServiceType, PriceUnit } from '@pet-care/shared'
import type { ServiceOffering } from '../types'

interface CreateServiceOfferingDto {
  serviceType: ServiceType
  price: number
  priceUnit?: PriceUnit
  durationMinutes?: number
  description?: string
}

export const serviceOfferingsService = {
  async getByCaretaker(userId: string): Promise<ServiceOffering[]> {
    const { data } = await apiClient.get<ServiceOffering[]>(`/services/caretaker/${userId}`)
    return data
  },

  async create(dto: CreateServiceOfferingDto): Promise<ServiceOffering> {
    const { data } = await apiClient.post<ServiceOffering>('/services', dto)
    return data
  },
}