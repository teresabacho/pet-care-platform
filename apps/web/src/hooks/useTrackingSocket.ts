import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

const WS_URL = 'http://localhost:3000/tracking'

export interface LivePoint {
  lat: number
  lng: number
  altitude: number | null
  speed: number | null
  timestamp: string
  walkSegmentId: string | null
}

interface UseTrackingSocketOptions {
  sessionId: string | null
  onPoint?: (p: LivePoint) => void
  onWalkStarted?: (segmentId: string) => void
  onWalkEnded?: (segmentId: string) => void
}

export function useTrackingSocket({
  sessionId,
  onPoint,
  onWalkStarted,
  onWalkEnded,
}: UseTrackingSocketOptions): void {
  const accessToken = useAuthStore((s) => s.accessToken)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!sessionId || !accessToken) return

    const socket = io(WS_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('tracking:subscribe', { sessionId })
    })

    socket.on('tracking:live-point', (p: LivePoint) => {
      onPoint?.(p)
    })
    socket.on(
      'tracking:walk-started',
      (p: { sessionId: string; segmentId: string }) => {
        onWalkStarted?.(p.segmentId)
      },
    )
    socket.on(
      'tracking:walk-ended',
      (p: { sessionId: string; segmentId: string }) => {
        onWalkEnded?.(p.segmentId)
      },
    )

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [sessionId, accessToken, onPoint, onWalkStarted, onWalkEnded])
}
