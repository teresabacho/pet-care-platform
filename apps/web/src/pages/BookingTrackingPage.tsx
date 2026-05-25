import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ArrowLeft,
  Loader2,
  Play,
  StopCircle,
} from 'lucide-react'
import { BookingStatus, WalkSegmentStatus } from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { bookingsService } from '../services/bookings.service'
import {
  trackingService,
  type TrackingSession,
  type WalkSegment,
  type TrackPoint,
} from '../services/tracking.service'
import { useTrackingSocket, type LivePoint } from '../hooks/useTrackingSocket'
import { useAuthStore } from '../store/authStore'
import type { Booking } from '../types'
import { cn } from '@/lib/utils'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const KYIV_FALLBACK: [number, number] = [50.4501, 30.5234]

function formatTime(d: string | Date): string {
  return new Date(d).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(startIso: string, endIso: string | null): string {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const totalMin = Math.max(0, Math.round((end - start) / 60000))
  if (totalMin < 60) return `${totalMin} хв`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h} год` : `${h} год ${m} хв`
}

function formatDistance(meters: number | null): string {
  if (meters == null) return '—'
  if (meters < 1000) return `${Math.round(meters)} м`
  return `${(meters / 1000).toFixed(2)} км`
}

export default function BookingTrackingPage() {
  const { id: bookingId } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [session, setSession] = useState<TrackingSession | null>(null)
  const [segments, setSegments] = useState<WalkSegment[]>([])
  const [livePoints, setLivePoints] = useState<LivePoint[]>([])
  const [pointsBySegment, setPointsBySegment] = useState<
    Record<string, TrackPoint[]>
  >({})
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const trackLayer = useRef<L.LayerGroup | null>(null)
  const marker = useRef<L.Marker | null>(null)

  const activeSegment = useMemo(
    () => segments.find((s) => s.status === WalkSegmentStatus.ACTIVE) ?? null,
    [segments],
  )

  const isCaretaker = user?.id === booking?.caretakerId
  const isOwner = user?.id === booking?.ownerId

  // Default: активна > остання за часом. Користувач може перебити кліком.
  const defaultSegmentId = useMemo<string | null>(() => {
    if (activeSegment) return activeSegment.id
    if (segments.length === 0) return null
    return segments[segments.length - 1].id
  }, [activeSegment, segments])

  const selectedSegmentId =
    userSelectedId && segments.some((s) => s.id === userSelectedId)
      ? userSelectedId
      : defaultSegmentId

  const selectedSegment = useMemo(
    () => segments.find((s) => s.id === selectedSegmentId) ?? null,
    [segments, selectedSegmentId],
  )

  const defaultCenter: [number, number] = useMemo(() => {
    const cp = booking?.caretaker?.caretakerProfile
    if (cp?.serviceLatitude != null && cp?.serviceLongitude != null) {
      return [cp.serviceLatitude, cp.serviceLongitude]
    }
    return KYIV_FALLBACK
  }, [booking])

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      bookingsService.getOne(bookingId),
      trackingService.getSessionByBookingId(bookingId),
    ])
      .then(([bk, sess]) => {
        if (cancelled) return
        setBooking(bk)
        setSession(sess)
        if (sess) {
          setSegments(sess.segments ?? [])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bookingId])

  // ── WS handlers ────────────────────────────────────────────────────────
  const handleLivePoint = useCallback((p: LivePoint) => {
    setLivePoints((prev) => [...prev, p])
  }, [])

  const refetchSegments = useCallback(async () => {
    if (!session) return
    const fresh = await trackingService
      .getSessionByBookingId(session.bookingId)
      .catch(() => null)
    if (fresh) setSegments(fresh.segments ?? [])
  }, [session])

  const handleWalkStarted = useCallback(async () => {
    await refetchSegments()
    setLivePoints([])
  }, [refetchSegments])

  const handleWalkEnded = useCallback(async () => {
    await refetchSegments()
    setLivePoints([])
  }, [refetchSegments])

  useTrackingSocket({
    sessionId: session?.id ?? null,
    onPoint: handleLivePoint,
    onWalkStarted: handleWalkStarted,
    onWalkEnded: handleWalkEnded,
  })

  // ── Завантаження точок обраного сегменту ────────────────────────────────
  // Кеш в `pointsBySegment` — щоб клік по старій прогулянці не робив зайвий запит.
  useEffect(() => {
    if (!session || !selectedSegmentId) return
    if (pointsBySegment[selectedSegmentId]) return
    let cancelled = false
    trackingService
      .getPoints(session.id, selectedSegmentId)
      .then((pts) => {
        if (cancelled) return
        setPointsBySegment((prev) => ({ ...prev, [selectedSegmentId]: pts }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [session, selectedSegmentId, pointsBySegment])

  // ── Polling для активного сегменту (фолбек якщо WS не доставляє) ────────
  useEffect(() => {
    if (!session || !activeSegment) return
    const segId = activeSegment.id
    const timer = window.setInterval(async () => {
      try {
        const pts = await trackingService.getPoints(session.id, segId)
        setPointsBySegment((prev) => ({ ...prev, [segId]: pts }))
      } catch {
        /* ignore */
      }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [session, activeSegment])

  // Точки для рендеру: кешовані з БД + live (тільки якщо обраний = активний)
  const renderPoints = useMemo<Array<{ lat: number; lng: number }>>(() => {
    if (!selectedSegmentId) return []
    const cached = pointsBySegment[selectedSegmentId] ?? []
    const base = cached.map((p) => ({ lat: p.lat, lng: p.lng }))
    if (activeSegment && selectedSegmentId === activeSegment.id) {
      return [...base, ...livePoints.map((p) => ({ lat: p.lat, lng: p.lng }))]
    }
    return base
  }, [selectedSegmentId, pointsBySegment, livePoints, activeSegment])

  // ── Map init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !booking || !session) return
    if (!mapRef.current || mapInstance.current) return
    const map = L.map(mapRef.current).setView(defaultCenter, 13)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        detectRetina: true,
      },
    ).addTo(map)
    trackLayer.current = L.layerGroup().addTo(map)
    mapInstance.current = map
    setTimeout(() => map.invalidateSize(), 100)
    return () => {
      map.remove()
      mapInstance.current = null
      trackLayer.current = null
    }
  }, [loading, booking, session, defaultCenter])

  // ── Render polyline + marker (або порожній стейт) ──────────────────────
  useEffect(() => {
    if (!mapInstance.current || !trackLayer.current) return
    trackLayer.current.clearLayers()
    if (marker.current) {
      marker.current.remove()
      marker.current = null
    }

    if (renderPoints.length === 0) {
      // Порожньо — повертаємо мапу до приблизної локації доглядальника.
      mapInstance.current.setView(defaultCenter, 13)
      return
    }

    const latLngs = renderPoints.map((p) => L.latLng(p.lat, p.lng))
    L.polyline(latLngs, {
      color: 'hsl(221, 83%, 53%)',
      weight: 3,
      opacity: 0.85,
    }).addTo(trackLayer.current)

    const last = latLngs[latLngs.length - 1]
    marker.current = L.marker(last).addTo(mapInstance.current)
    mapInstance.current.fitBounds(L.latLngBounds(latLngs), {
      padding: [40, 40],
      maxZoom: 16,
    })
  }, [renderPoints, defaultCenter])

  // ── Caretaker actions ─────────────────────────────────────────────────
  async function handleStartWalk() {
    if (!session) return
    setActionBusy(true)
    try {
      await trackingService.startWalkSegment(session.id)
      await refetchSegments()
      setLivePoints([])
      setUserSelectedId(null) // повернутись на дефолт = новий активний
    } finally {
      setActionBusy(false)
    }
  }

  async function handleEndWalk() {
    if (!activeSegment || !session) return
    setActionBusy(true)
    try {
      await trackingService.completeWalkSegment(activeSegment.id)
      // Інвалідовуємо кеш точок щойно завершеного сегменту, щоб підтягнути
      // фінальну версію з БД (після flush).
      setPointsBySegment((prev) => {
        const next = { ...prev }
        delete next[activeSegment.id]
        return next
      })
      await refetchSegments()
      setLivePoints([])
    } finally {
      setActionBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-zinc-500 mb-4">Замовлення не знайдено.</p>
        <Link to="/bookings" className="text-zinc-900 underline">
          ← До замовлень
        </Link>
      </div>
    )
  }

  if (
    booking.status !== BookingStatus.IN_PROGRESS &&
    booking.status !== BookingStatus.COMPLETED &&
    booking.status !== BookingStatus.RETURN_PENDING
  ) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-zinc-500 mb-2">
          Маршрут стає доступним після того, як замовлення розпочате.
        </p>
        <p className="text-xs text-zinc-400 mb-4">
          Поточний статус: {booking.status}
        </p>
        <Link to="/bookings" className="text-zinc-900 underline">
          ← До замовлень
        </Link>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-zinc-500 mb-4">Tracking-сесія ще не створена.</p>
        <Link to="/bookings" className="text-zinc-900 underline">
          ← До замовлень
        </Link>
      </div>
    )
  }

  const selectedIsActive =
    selectedSegment?.status === WalkSegmentStatus.ACTIVE

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <Link
        to="/bookings"
        className="inline-flex items-center gap-1 text-sm text-zinc-700 hover:text-zinc-900 mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        До замовлень
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">
        {booking.status === BookingStatus.COMPLETED
          ? 'Маршрут прогулянки'
          : 'Live-трекінг'}
      </h1>
      <p className="text-sm text-zinc-500 mb-4">
        {booking.pet?.name ?? 'Тваринка'} ·{' '}
        {new Date(booking.scheduledStart).toLocaleString('uk-UA')}
      </p>

      {/* Деталі обраної прогулянки */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 mb-3">
        {selectedSegment ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div>
              <p className="text-xs text-zinc-500">Прогулянка</p>
              <p className="text-sm font-medium text-zinc-900">
                {formatTime(selectedSegment.startedAt)}
                {selectedSegment.endedAt
                  ? ` — ${formatTime(selectedSegment.endedAt)}`
                  : ' — триває…'}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Тривалість</p>
              <p className="text-sm font-medium text-zinc-900">
                {formatDuration(
                  selectedSegment.startedAt,
                  selectedSegment.endedAt,
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Дистанція</p>
              <p className="text-sm font-medium text-zinc-900">
                {formatDistance(selectedSegment.distanceMeters)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Точок</p>
              <p className="text-sm font-medium text-zinc-900">
                {renderPoints.length}
              </p>
            </div>
            {selectedIsActive && (
              <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                наживо
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            Прогулянок ще не було. Коли доглядальник запустить першу — її
            маршрут зʼявиться на цій карті.
          </p>
        )}
      </div>

      <div className="rounded-lg overflow-hidden border border-zinc-200 mb-4">
        <div ref={mapRef} className="w-full h-[480px]" />
      </div>

      {/* Caretaker control panel */}
      {isCaretaker && booking.status === BookingStatus.IN_PROGRESS && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              {activeSegment ? 'Прогулянка триває' : 'Прогулянка не розпочата'}
            </p>
            <p className="text-xs text-zinc-500">
              {activeSegment
                ? 'GPS-точки надходять. Натисніть «Завершити» коли повернетесь.'
                : 'Натисніть «Почати прогулянку» — увімкнеться симуляція GPS-трекера.'}
            </p>
          </div>
          {activeSegment ? (
            <Button
              type="button"
              onClick={handleEndWalk}
              disabled={actionBusy}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <StopCircle className="w-4 h-4 mr-1" />
                  Завершити прогулянку
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleStartWalk}
              disabled={actionBusy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Почати прогулянку
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Walks list */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900 mb-2">
          Прогулянки ({segments.length})
        </h2>
        {segments.length === 0 ? (
          <p className="text-sm text-zinc-500">Поки що жодної прогулянки.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {segments.map((s) => {
              const isSelected = s.id === selectedSegmentId
              const isActive = s.status === WalkSegmentStatus.ACTIVE
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setUserSelectedId(s.id)}
                    className={cn(
                      'w-full py-2.5 px-2 -mx-2 rounded-md flex items-center justify-between gap-3 text-left transition-colors',
                      isSelected ? 'bg-zinc-100' : 'hover:bg-zinc-50',
                    )}
                  >
                    <div>
                      <p className="text-sm text-zinc-900">
                        {formatTime(s.startedAt)}
                        {s.endedAt ? ` — ${formatTime(s.endedAt)}` : ''}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDuration(s.startedAt, s.endedAt)}
                        {' · '}
                        {formatDistance(s.distanceMeters)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-[11px] px-2 py-0.5 rounded-full',
                        isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-zinc-100 text-zinc-600',
                      )}
                    >
                      {isActive ? 'триває' : 'завершено'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {isOwner &&
          booking.status === BookingStatus.IN_PROGRESS &&
          !activeSegment && (
            <p className="text-xs text-zinc-500 mt-3">
              Доглядальник ще не розпочав прогулянку. Коли натисне «Почати»,
              точки почнуть надходити сюди в реальному часі.
            </p>
          )}
      </div>
    </div>
  )
}
