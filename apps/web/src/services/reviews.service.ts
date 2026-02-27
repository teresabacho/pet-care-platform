import { apiClient } from './api'
import type { Review, ReviewsStats } from '../types'

interface CreateReviewDto {
  bookingId: string
  rating: number
  comment?: string
}

export const reviewsService = {
  async getByUser(userId: string): Promise<ReviewsStats> {
    const { data } = await apiClient.get<ReviewsStats>(`/reviews/user/${userId}`)
    return data
  },

  async create(dto: CreateReviewDto): Promise<Review> {
    const { data } = await apiClient.post<Review>('/reviews', dto)
    return data
  },
}