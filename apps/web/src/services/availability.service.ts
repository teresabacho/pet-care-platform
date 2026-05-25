import { apiClient } from './api'
import type { AvailabilitySlot } from '@pet-care/shared'

export interface AvailabilityRow {
  id: string
  caretakerProfileId: string
  date: string
  slot: AvailabilitySlot
}

export interface AvailabilityDayPayload {
  date: string
  slots: AvailabilitySlot[]
}

export const availabilityService = {
  async list(
    caretakerProfileId: string,
    from: string,
    to: string,
  ): Promise<AvailabilityRow[]> {
    const { data } = await apiClient.get<AvailabilityRow[]>(
      `/caretaker-profile/${caretakerProfileId}/availability`,
      { params: { from, to } },
    )
    return data
  },

  async setMine(days: AvailabilityDayPayload[]): Promise<AvailabilityRow[]> {
    const { data } = await apiClient.put<AvailabilityRow[]>(
      `/caretaker-profile/me/availability`,
      { days },
    )
    return data
  },
}
