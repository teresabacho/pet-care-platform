import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CaretakerProfile } from '../../types'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface LocationSectionProps {
  profile: CaretakerProfile
  className?: string
}

const COUNTRY_LABELS: Record<string, string> = {
  UA: 'Україна',
  PL: 'Польща',
  HU: 'Угорщина',
}

function formatAddress(profile: CaretakerProfile): string {
  const parts: string[] = []
  if (profile.city) parts.push(profile.city)
  if (profile.addressIsPublic && profile.street) parts.push(profile.street)
  if (profile.country) {
    const country = COUNTRY_LABELS[profile.country] ?? profile.country
    parts.push(country)
  }
  return parts.join(', ')
}

export default function LocationSection({ profile, className }: LocationSectionProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  const lat = profile.serviceLatitude
  const lng = profile.serviceLongitude
  const radiusKm = profile.radiusKm ?? 0
  const hasCoords = lat != null && lng != null

  useEffect(() => {
    if (!mapRef.current || !hasCoords) return
    if (mapInstance.current) {
      mapInstance.current.remove()
      mapInstance.current = null
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([lat, lng], radiusKm > 0 ? Math.max(10, 14 - Math.log2(radiusKm)) : 13)

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

    L.marker([lat, lng]).addTo(map)
    if (radiusKm > 0) {
      const circle = L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: 'hsl(221, 83%, 53%)',
        fillColor: 'hsl(221, 83%, 53%)',
        fillOpacity: 0.08,
        weight: 1.5,
      }).addTo(map)
      map.fitBounds(circle.getBounds(), { padding: [20, 20] })
    }

    mapInstance.current = map
    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [lat, lng, radiusKm, hasCoords])

  const address = formatAddress(profile)
  const obfuscated = !profile.addressIsPublic && hasCoords

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="text-base font-semibold text-zinc-900">Локація і зона роботи</h2>

      {!hasCoords ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Доглядальник ще не вказав свою локацію.
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
          <div ref={mapRef} className="w-full h-[260px]" />
          <div className="p-4 flex flex-col gap-2">
            {address && (
              <div className="flex items-start gap-2 text-sm text-zinc-700">
                <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <span>{address}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
              {radiusKm > 0 && (
                <span>
                  Радіус виконання:{' '}
                  <strong className="text-zinc-700">{radiusKm} км</strong>
                </span>
              )}
              {obfuscated && (
                <span>
                  Точка на карті — приблизна (зміщена на 200–500 м для приватності)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
