import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ServiceType } from '@pet-care/shared'
import { serviceOfferingsService } from '../services/service-offerings.service'
import type { SearchResult } from '../types'

// Fix Leaflet default marker icon broken by Vite asset bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома',
  [ServiceType.BOARDING]: 'Пансіон',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринар',
}

const DEFAULT_LAT = 50.4501
const DEFAULT_LNG = 30.5234
const DEFAULT_ZOOM = 12

export default function SearchPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)

  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<ServiceType | ''>('')
  const [radiusKm, setRadiusKm] = useState(10)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Initialize Leaflet map once on mount
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return

    const map = L.map(mapRef.current).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    markersLayer.current = L.layerGroup().addTo(map)
    leafletMap.current = map

    return () => {
      map.remove()
      leafletMap.current = null
    }
  }, [])

  // Update markers whenever results change
  useEffect(() => {
    if (!markersLayer.current) return
    markersLayer.current.clearLayers()

    results.forEach((result) => {
      const lat = result.caretaker.serviceLatitude
      const lng = result.caretaker.serviceLongitude
      if (lat == null || lng == null) return

      const name =
        result.caretaker.user.firstName ?? result.caretaker.user.email
      const label = SERVICE_TYPE_LABELS[result.serviceType]
      const price = `${result.price} грн`

      const marker = L.marker([lat, lng])
      marker.bindPopup(
        `<div class="text-sm">
          <p class="font-semibold">${name}</p>
          <p>${label} — ${price}</p>
          <a href="/caretaker/${result.caretaker.userId}" class="text-blue-600 underline">Переглянути профіль</a>
        </div>`
      )
      markersLayer.current!.addLayer(marker)
    })
  }, [results])

  const handleSearch = async () => {
    setIsLoading(true)
    try {
      const data = await serviceOfferingsService.search({
        type: selectedType || undefined,
        lat: userLat ?? undefined,
        lng: userLng ?? undefined,
        radiusKm: userLat != null ? radiusKm : undefined,
      })
      setResults(data)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetLocation = () => {
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLat(latitude)
        setUserLng(longitude)
        leafletMap.current?.setView([latitude, longitude], DEFAULT_ZOOM)
      },
      () => {
        setLocationError('Не вдалося визначити місцезнаходження')
      }
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left panel — filters + results */}
      <div className="w-96 flex-shrink-0 flex flex-col border-r overflow-y-auto bg-white">
        <div className="p-4 border-b space-y-3">
          <h1 className="text-lg font-bold">Пошук доглядачів</h1>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Тип послуги</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ServiceType | '')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Всі послуги</option>
              {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Радіус пошуку: {radiusKm} км
            </label>
            <input
              type="range" min={1} max={50} value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGetLocation}
              className="flex-1 border border-blue-600 text-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-50"
            >
              Моє місцезнаходження
            </button>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Пошук...' : 'Знайти'}
            </button>
          </div>

          {locationError && (
            <p className="text-xs text-red-500">{locationError}</p>
          )}
          {userLat != null && (
            <p className="text-xs text-green-600">
              Геолокація визначена ({userLat.toFixed(4)}, {userLng?.toFixed(4)})
            </p>
          )}
        </div>

        {/* Results list */}
        <div className="flex-1 p-3 space-y-2">
          {results.length === 0 && !isLoading && (
            <p className="text-sm text-gray-400 text-center py-8">
              Натисніть «Знайти» для пошуку
            </p>
          )}
          {results.map((result) => {
            const name =
              result.caretaker.user.firstName
                ? `${result.caretaker.user.firstName} ${result.caretaker.user.lastName ?? ''}`.trim()
                : result.caretaker.user.email
            return (
              <div key={result.id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{name}</p>
                    <p className="text-xs text-gray-500">
                      {SERVICE_TYPE_LABELS[result.serviceType]}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">
                    {result.price} грн
                  </span>
                </div>
                {result.caretaker.bio && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {result.caretaker.bio}
                  </p>
                )}
                <a
                  href={`/caretaker/${result.caretaker.userId}`}
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  Переглянути профіль →
                </a>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel — map */}
      <div className="flex-1" ref={mapRef} />
    </div>
  )
}