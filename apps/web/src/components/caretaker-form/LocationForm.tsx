import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ChevronDown } from 'lucide-react'
import {
  COUNTRY_LABELS,
  COUNTRY_NOMINATIM_CODES,
  Country,
  SUPPORTED_COUNTRIES,
} from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Fix Leaflet default marker icon (Vite asset bundling).
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const COUNTRY_CENTERS: Record<Country, [number, number, number]> = {
  [Country.UA]: [50.4501, 30.5234, 6],
  [Country.PL]: [52.2297, 21.0122, 6],
  [Country.HU]: [47.4979, 19.0402, 7],
}
const DEFAULT_LAT = 50.4501
const DEFAULT_LNG = 30.5234
const DEFAULT_ZOOM = 12

interface NominatimSearchResult {
  lat: string
  lon: string
  display_name: string
}

interface NominatimReverseResult {
  display_name: string
  address?: {
    road?: string
    pedestrian?: string
    house_number?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    country_code?: string
  }
}

export interface LocationFormValue {
  serviceLatitude: number | null
  serviceLongitude: number | null
  radiusKm: number
  addressIsPublic: boolean
  country: string | null
  city: string
  street: string
  apartment: string
  floor: string
  entrance: string
}

interface LocationFormProps {
  value: LocationFormValue
  onChange: (next: LocationFormValue) => void
  /** Якщо true — показуємо select країни (для wizard). У edit-режимі країна
   * вже обрана при онбордингу і змінюється рідко, тож можна сховати. */
  showCountrySelect?: boolean
}

export function LocationForm({
  value,
  onChange,
  showCountrySelect = false,
}: LocationFormProps) {
  const selectedCountry = SUPPORTED_COUNTRIES.includes(value.country as Country)
    ? (value.country as Country)
    : null

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  function patch(p: Partial<LocationFormValue>) {
    onChange({ ...value, ...p })
  }

  // Init map once mounted.
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const initLat = value.serviceLatitude ?? DEFAULT_LAT
    const initLng = value.serviceLongitude ?? DEFAULT_LNG
    const map = L.map(mapRef.current).setView([initLat, initLng], DEFAULT_ZOOM)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      },
    ).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      patch({ serviceLatitude: e.latlng.lat, serviceLongitude: e.latlng.lng })
      void reverseGeocode(e.latlng.lat, e.latlng.lng)
    })

    mapInstance.current = map
    // Кілька invalidateSize на випадок прихованого/анімованого контейнера.
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 350)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      map.remove()
      mapInstance.current = null
      markerRef.current = null
      circleRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync marker + circle to value
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    const lat = value.serviceLatitude
    const lng = value.serviceLongitude
    if (lat !== null && lng !== null) {
      const pos = L.latLng(lat, lng)
      if (!markerRef.current) {
        markerRef.current = L.marker(pos).addTo(map)
      } else {
        markerRef.current.setLatLng(pos)
      }
      if (!circleRef.current) {
        circleRef.current = L.circle(pos, {
          radius: value.radiusKm * 1000,
          color: '#18181b',
          fillColor: '#18181b',
          fillOpacity: 0.1,
        }).addTo(map)
      } else {
        circleRef.current.setLatLng(pos)
        circleRef.current.setRadius(value.radiusKm * 1000)
      }
      map.panTo(pos)
    }
  }, [value.serviceLatitude, value.serviceLongitude, value.radiusKm])

  async function reverseGeocode(la: number, ln: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${ln}&format=json&accept-language=uk`,
      )
      const data = (await res.json()) as NominatimReverseResult
      const a = data.address
      const updates: Partial<LocationFormValue> = {}
      if (a) {
        const inferredStreet = [a.road ?? a.pedestrian, a.house_number]
          .filter(Boolean)
          .join(', ')
        if (inferredStreet) updates.street = inferredStreet
        const inferredCity = a.city ?? a.town ?? a.village ?? a.suburb
        if (inferredCity) updates.city = inferredCity
        if (a.country_code) updates.country = a.country_code.toUpperCase()
      }
      if (Object.keys(updates).length > 0) {
        onChange({ ...value, ...updates, serviceLatitude: la, serviceLongitude: ln })
      }
    } catch {
      // тихо ігноруємо
    }
  }

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
        'accept-language': 'uk',
      })
      if (selectedCountry) {
        params.set('countrycodes', COUNTRY_NOMINATIM_CODES[selectedCountry])
      }
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
      )
      const data = (await res.json()) as NominatimSearchResult[]
      if (data.length === 0) {
        setSearchError(
          'Адресу не знайдено — спробуйте інше формулювання або клікніть на карту',
        )
        return
      }
      const [first] = data
      const newLat = Number(first.lat)
      const newLng = Number(first.lon)
      patch({ serviceLatitude: newLat, serviceLongitude: newLng })
      void reverseGeocode(newLat, newLng)
    } catch {
      setSearchError('Не вдалося звʼязатись з геокодером')
    } finally {
      setSearching(false)
    }
  }

  function handleCountryChange(next: Country) {
    onChange({
      ...value,
      country: next,
      serviceLatitude: null,
      serviceLongitude: null,
      city: '',
      street: '',
    })
    setQuery('')
    if (mapInstance.current) {
      const [lat, lng, zoom] = COUNTRY_CENTERS[next]
      mapInstance.current.setView([lat, lng], zoom)
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      if (circleRef.current) {
        circleRef.current.remove()
        circleRef.current = null
      }
    }
  }

  return (
    <div className="space-y-4">
      {showCountrySelect && (
        <div className="space-y-1.5">
          <Label htmlFor="lf-country">Країна</Label>
          <Select
            value={selectedCountry ?? undefined}
            onValueChange={(v) => handleCountryChange(v as Country)}
          >
            <SelectTrigger id="lf-country">
              <SelectValue placeholder="Оберіть країну" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {COUNTRY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="lf-search">Адреса</Label>
        <div className="flex gap-2">
          <Input
            id="lf-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Наприклад, Київ, вул. Хрещатик, 22"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleSearch()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? 'Шукаю…' : 'Знайти'}
          </Button>
        </div>
        {searchError && (
          <p className="text-sm text-destructive">{searchError}</p>
        )}
      </div>

      <div
        ref={mapRef}
        className="w-full h-[320px] rounded-lg border border-zinc-200"
      />
      <p className="text-xs text-zinc-500 -mt-2">
        Клікніть на карту, щоб встановити маркер вручну.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Радіус роботи</Label>
          <span className="text-sm font-medium text-zinc-900">
            {value.radiusKm} км
          </span>
        </div>
        <Slider
          value={[value.radiusKm]}
          onValueChange={(v) => patch({ radiusKm: v[0] })}
          min={1}
          max={50}
          step={1}
        />
      </div>

      <div className="border border-zinc-200 rounded-lg">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <span>Уточнити адресу (опціонально)</span>
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              showDetails && 'rotate-180',
            )}
          />
        </button>
        {showDetails && (
          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-zinc-200">
            <div className="space-y-1.5">
              <Label htmlFor="lf-city">Місто</Label>
              <Input
                id="lf-city"
                value={value.city}
                onChange={(e) => patch({ city: e.target.value })}
                placeholder="Київ"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lf-street">Вулиця, будинок</Label>
              <Input
                id="lf-street"
                value={value.street}
                onChange={(e) => patch({ street: e.target.value })}
                placeholder="вул. Хрещатик, 22"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="lf-apt">Квартира</Label>
                <Input
                  id="lf-apt"
                  value={value.apartment}
                  onChange={(e) => patch({ apartment: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lf-floor">Поверх</Label>
                <Input
                  id="lf-floor"
                  value={value.floor}
                  onChange={(e) => patch({ floor: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lf-entrance">Підʼїзд</Label>
                <Input
                  id="lf-entrance"
                  value={value.entrance}
                  onChange={(e) => patch({ entrance: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2">
        <input
          id="lf-public"
          type="checkbox"
          checked={value.addressIsPublic}
          onChange={(e) => patch({ addressIsPublic: e.target.checked })}
          className="mt-1"
        />
        <div className="flex flex-col">
          <Label htmlFor="lf-public" className="font-medium">
            Показувати точну адресу клієнтам
          </Label>
          <span className="text-xs text-zinc-500">
            Якщо вимкнено, клієнти бачитимуть приблизну зону. Точну адресу —
            лише після підтвердженого замовлення.
          </span>
        </div>
      </div>
    </div>
  )
}
