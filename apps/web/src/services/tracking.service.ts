import { apiClient } from './api'
import type { WalkSegmentStatus, TrackingSessionStatus } from '@pet-care/shared'

export interface TrackingSession {
  id: string
  bookingId: string
  status: TrackingSessionStatus
  startedAt: string
  endedAt: string | null
  segments?: WalkSegment[]
}

export interface WalkSegment {
  id: string
  sessionId: string
  status: WalkSegmentStatus
  startedAt: string
  endedAt: string | null
  distanceMeters: number | null
}

export interface TrackPoint {
  id: string
  sessionId: string
  walkSegmentId: string | null
  lat: number
  lng: number
  altitude: number | null
  speed: number | null
  timestamp: string
}

export const trackingService = {
  async getSessionByBookingId(bookingId: string): Promise<TrackingSession | null> {
    try {
      const { data } = await apiClient.get<{
        session: TrackingSession
        segments: WalkSegment[]
      }>(`/tracking/sessions/booking/${bookingId}`)
      return { ...data.session, segments: data.segments }
    } catch {
      return null
    }
  },

  async startWalkSegment(sessionId: string): Promise<WalkSegment> {
    const { data } = await apiClient.post<WalkSegment>(
      `/tracking/sessions/${sessionId}/walk-segments`,
    )
    return data
  },

  async completeWalkSegment(segmentId: string): Promise<WalkSegment> {
    const { data } = await apiClient.patch<WalkSegment>(
      `/tracking/walk-segments/${segmentId}/complete`,
    )
    return data
  },

  async getPoints(
    sessionId: string,
    segmentId?: string,
  ): Promise<TrackPoint[]> {
    const params = segmentId ? { segmentId } : undefined
    const { data } = await apiClient.get<TrackPoint[]>(
      `/tracking/sessions/${sessionId}/points`,
      { params },
    )
    return data
  },
}
