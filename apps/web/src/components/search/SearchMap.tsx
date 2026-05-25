import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SearchResult } from '../../types'

// Fix Leaflet default marker icon broken by Vite asset bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SERVICE_TYPE_LABELS: Record<string, string> = {
  WALKING: 'Вигул',
  PET_SITTING: 'Догляд вдома',
  BOARDING: 'Пансіон',
  GROOMING: 'Грумінг',
  VET_VISIT: 'Ветеринар',
}

const DEFAULT_LAT = 50.4501
const DEFAULT_LNG = 30.5234
const DEFAULT_ZOOM = 12

interface SearchMapProps {
  centerLat: number | null
  centerLng: number | null
  radiusKm: number
  results: SearchResult[]
  highlightedId?: string | null
}

export default function SearchMap({ centerLat, centerLng, radiusKm, results, highlightedId }: SearchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)
  const radiusCircle = useRef<L.Circle | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
      detectRetina: true,
    }).addTo(map)

    markersLayer.current = L.layerGroup().addTo(map)
    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // Pan map when search center changes
  useEffect(() => {
    if (!mapInstance.current || centerLat == null || centerLng == null) return

    mapInstance.current.setView([centerLat, centerLng], DEFAULT_ZOOM)

    radiusCircle.current?.remove()
    radiusCircle.current = L.circle([centerLat, centerLng], {
      radius: radiusKm * 1000,
      color: 'hsl(221, 83%, 53%)',
      fillColor: 'hsl(221, 83%, 53%)',
      fillOpacity: 0.08,
      weight: 1.5,
    }).addTo(mapInstance.current)
  }, [centerLat, centerLng, radiusKm])

  // Re-draw markers when results change
  useEffect(() => {
    if (!markersLayer.current) return
    markersLayer.current.clearLayers()

    results.forEach((result) => {
      const lat = result.caretaker.serviceLatitude
      const lng = result.caretaker.serviceLongitude
      if (lat == null || lng == null) return

      const name = result.caretaker.user.firstName
        ? `${result.caretaker.user.firstName} ${result.caretaker.user.lastName ?? ''}`.trim()
        : result.caretaker.user.email

      const isHighlighted = result.id === highlightedId
      const tiers = result.tiers ?? []
      let minPrice: number | null = null
      for (const t of tiers) {
        const v = parseFloat(t.basePrice)
        if (!Number.isNaN(v) && (minPrice === null || v < minPrice)) minPrice = v
      }
      const priceText = minPrice !== null ? `${minPrice.toFixed(0)} грн` : '—'
      const palette = isHighlighted
        ? { bg: '#18181b', fg: '#ffffff', border: '#18181b', shadow: '0 4px 10px rgba(0,0,0,.25)' }
        : { bg: '#ffffff', fg: '#18181b', border: '#d4d4d8', shadow: '0 2px 6px rgba(0,0,0,.15)' }

      const icon = L.divIcon({
        className: 'price-tag-marker',
        html: `<div style="
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            background:${palette.bg};
            color:${palette.fg};
            border:1.5px solid ${palette.border};
            border-radius:8px;
            font:600 12px/1 system-ui,-apple-system,'Segoe UI',sans-serif;
            white-space:nowrap;
            box-shadow:${palette.shadow};
            box-sizing:border-box;
          ">${priceText}</div>`,
        iconSize: [70, 28],
        iconAnchor: [35, 14],
      })

      const marker = L.marker([lat, lng], { icon, zIndexOffset: isHighlighted ? 1000 : 0 })
      marker.bindPopup(
        `<div style="font-size:13px;min-width:160px">
          <p style="font-weight:600;margin:0 0 4px">${name}</p>
          <p style="color:#666;margin:0 0 4px">${SERVICE_TYPE_LABELS[result.serviceType] ?? result.serviceType}${minPrice !== null ? ` — ${priceText}` : ''}</p>
          <a href="/caretaker/${result.caretaker.userId}" style="color:hsl(221,83%,53%);font-size:12px">Переглянути профіль →</a>
        </div>`,
      )
      markersLayer.current!.addLayer(marker)
    })
  }, [results, highlightedId])

  return <div ref={mapRef} className="w-full h-full" />
}
