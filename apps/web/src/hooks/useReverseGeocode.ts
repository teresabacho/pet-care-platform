import { useEffect, useState } from 'react'

const memCache = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()
let lastRequestAt = 0
const NOMINATIM_GAP_MS = 1100

function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

function readPersistent(key: string): string | null {
  try {
    return localStorage.getItem(`geo:${key}`)
  } catch {
    return null
  }
}

function writePersistent(key: string, value: string): void {
  try {
    localStorage.setItem(`geo:${key}`, value)
  } catch {
    /* quota or disabled — ignore */
  }
}

async function fetchLabel(lat: number, lng: number): Promise<string | null> {
  const wait = Math.max(0, NOMINATIM_GAP_MS - (Date.now() - lastRequestAt))
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestAt = Date.now()

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=uk&zoom=14`
  const res = await fetch(url, { headers: { 'Accept-Language': 'uk' } })
  if (!res.ok) return null
  const data = (await res.json()) as {
    address?: {
      city?: string
      town?: string
      village?: string
      suburb?: string
      neighbourhood?: string
      city_district?: string
      state?: string
    }
  }
  const a = data.address ?? {}
  const city = a.city ?? a.town ?? a.village ?? a.state ?? null
  const district = a.suburb ?? a.neighbourhood ?? a.city_district ?? null
  if (city && district) return `${city}, ${district}`
  return city ?? district ?? null
}

async function geocode(lat: number, lng: number): Promise<string | null> {
  const key = coordKey(lat, lng)

  if (memCache.has(key)) return memCache.get(key)!

  const persisted = readPersistent(key)
  if (persisted) {
    memCache.set(key, persisted)
    return persisted
  }

  const existing = inflight.get(key)
  if (existing) return existing

  const promise = fetchLabel(lat, lng)
    .then((label) => {
      if (label) {
        memCache.set(key, label)
        writePersistent(key, label)
      }
      return label
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}

export function useReverseGeocode(lat: number | null | undefined, lng: number | null | undefined): string | null {
  const [label, setLabel] = useState<string | null>(() => {
    if (lat == null || lng == null) return null
    const key = coordKey(lat, lng)
    return memCache.get(key) ?? readPersistent(key)
  })

  useEffect(() => {
    if (lat == null || lng == null) {
      setLabel(null)
      return
    }
    const key = coordKey(lat, lng)
    const cached = memCache.get(key) ?? readPersistent(key)
    if (cached) {
      setLabel(cached)
      return
    }
    let cancelled = false
    geocode(lat, lng).then((res) => {
      if (!cancelled) setLabel(res)
    })
    return () => {
      cancelled = true
    }
  }, [lat, lng])

  return label
}
