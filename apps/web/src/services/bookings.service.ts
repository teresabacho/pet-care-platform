import { apiClient } from './api'
import { BookingStatus } from '@pet-care/shared'
import type { Booking, CreateBookingDto } from '../types'

export const bookingsService = {
  async getMyBookings(): Promise<Booking[]> {
    const { data } = await apiClient.get<Booking[]>('/bookings')
    return data
  },

  async getOne(id: string): Promise<Booking> {
    const { data } = await apiClient.get<Booking>(`/bookings/${id}`)
    return data
  },

  async create(dto: CreateBookingDto): Promise<Booking> {
    const { data } = await apiClient.post<Booking>('/bookings', dto)
    return data
  },

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const { data } = await apiClient.patch<Booking>(`/bookings/${id}/status`, { status })
    return data
  },

  async confirmHandover(id: string): Promise<Booking> {
    const { data } = await apiClient.post<Booking>(`/bookings/${id}/confirm-handover`)
    return data
  },

  async confirmReturn(id: string): Promise<Booking> {
    const { data } = await apiClient.post<Booking>(`/bookings/${id}/confirm-return`)
    return data
  },
}