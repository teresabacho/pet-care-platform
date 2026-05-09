import { apiClient } from './api'
import type {
  AddonPriceUnit,
  DayType,
  PriceUnit,
  ServiceType,
} from '@pet-care/shared'
import type {
  ServiceOffering,
  SearchResult,
  WalkingPolicy,
  PetSittingPolicy,
  BoardingPolicy,
} from '../types'

export interface CreateServiceTierInput {
  durationMinutes?: number | null
  basePrice: number
  priceUnit: PriceUnit
  dayType?: DayType
}

export interface CreateSizeSurchargeInput {
  petSpecies: 'DOG' | 'CAT'
  size: string
  surchargeAmount: number
}

export interface CreateServiceAddonInput {
  name: string
  description?: string
  price: number
  priceUnit: AddonPriceUnit
}

// Policy DTO без id/serviceOfferingId — їх проставляє бекенд.
export type WalkingPolicyInput = Omit<WalkingPolicy, 'id' | 'serviceOfferingId'>
export type PetSittingPolicyInput = Omit<PetSittingPolicy, 'id' | 'serviceOfferingId'>
export type BoardingPolicyInput = Omit<BoardingPolicy, 'id' | 'serviceOfferingId'>

export interface CreateServiceOfferingDto {
  serviceType: ServiceType
  description?: string
  tiers: CreateServiceTierInput[]
  sizeSurcharges?: CreateSizeSurchargeInput[]
  addons?: CreateServiceAddonInput[]
  walkingPolicy?: WalkingPolicyInput
  petSittingPolicy?: PetSittingPolicyInput
  boardingPolicy?: BoardingPolicyInput
}

// На update tier може мати id (existing tier) або не мати (новий tier).
// Tiers з id, що відсутні у payload-і, бекенд видаляє — якщо немає Booking
// з посиланням на них (інакше повертає 409).
export interface UpdateServiceTierInput {
  id?: string
  durationMinutes?: number | null
  basePrice: number
  priceUnit: PriceUnit
  dayType?: DayType
}

export interface UpdateServiceOfferingDto {
  description?: string | null
  tiers?: UpdateServiceTierInput[]
  sizeSurcharges?: CreateSizeSurchargeInput[]
  addons?: CreateServiceAddonInput[]
  walkingPolicy?: WalkingPolicyInput
  petSittingPolicy?: PetSittingPolicyInput
  boardingPolicy?: BoardingPolicyInput
}

interface SearchServicesParams {
  type?: ServiceType
  lat?: number
  lng?: number
  radiusKm?: number
}

export const serviceOfferingsService = {
  async getByCaretaker(userId: string): Promise<ServiceOffering[]> {
    const { data } = await apiClient.get<ServiceOffering[]>(`/services/caretaker/${userId}`)
    return data
  },

  async getById(id: string): Promise<ServiceOffering> {
    const { data } = await apiClient.get<ServiceOffering>(`/services/${id}`)
    return data
  },

  async create(dto: CreateServiceOfferingDto): Promise<ServiceOffering> {
    const { data } = await apiClient.post<ServiceOffering>('/services', dto)
    return data
  },

  async update(
    id: string,
    dto: UpdateServiceOfferingDto,
  ): Promise<ServiceOffering> {
    const { data } = await apiClient.patch<ServiceOffering>(
      `/services/${id}`,
      dto,
    )
    return data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/services/${id}`)
  },

  async search(params: SearchServicesParams): Promise<SearchResult[]> {
    const { data } = await apiClient.get<SearchResult[]>('/services', { params })
    return data
  },
}
