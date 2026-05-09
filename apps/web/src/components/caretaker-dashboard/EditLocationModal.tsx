import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ChevronDown, Loader2 } from 'lucide-react'
import { COUNTRY_NOMINATIM_CODES, Country } from '@pet-care/shared'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { caretakerProfileService } from '../../services/caretaker-profile.service'
import type { CaretakerProfile } from '../../types'
import { cn } from '@/lib/utils'

interface EditLocationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: CaretakerProfile
  onSaved: (next: CaretakerProfile) => void
}

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
  }
}

const DEFAULT_LAT = 50.4501
const DEFAULT_LNG = 30.5234
const DEFAULT_ZOOM = 12

export default function EditLocationModal({
  open,
  onOpenChange,
  profile,
  onSaved,
}: EditLocationModalProps) {
  const [lat, setLat] = useState<number | null>(profile.serviceLatitude)
  const [lng, setLng] = useState<number | null>(profile.serviceLongitude)
  const [radiusKm, setRadiusKm] = useState<number>(profile.radiusKm ?? 5)
  const [addressIsPublic, setAddressIsPublic] = useState<boolean>(
    profile.addressIsPublic,
  )
  const [city, setCity] = useState(profile.city ?? '')
  const [street, setStreet] = useState(profile.street ?? '')
  const [apartment, setApartment] = useState(profile.apartment ?? '')
  const [floor, setFloor] = useState(profile.floor ?? '')
  const [entrance, setEntrance] = useState(profile.entrance ?? '')
  const [showDetails, setShowDetails] = useState(false)

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setLat(profile.serviceLatitude)
      setLng(profile.serviceLongitude)
      setRadiusKm(profile.radiusKm ?? 5)
      setAddressIsPublic(profile.addressIsPublic)
      setCity(profile.city ?? '')
      setStreet(profile.street ?? '')
      setApartment(profile.apartment ?? '')
      setFloor(profile.floor ?? '')
      setEntrance(profile.entrance ?? '')
      setQuery('')
      setSearchError(null)
      setError(null)
      setShowDetails(false)
    }
  }, [open, profile])

  // Init map after Sheet opens (otherwise container has 0 size).
  useEffect(() => {
    if (!open || !mapRef.current || mapInstance.current) return
    const initLat = profile.serviceLatitude ?? DEFAULT_LAT
    const initLng = profile.serviceLongitude ?? DEFAULT_LNG
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
      setLat(e.latlng.lat)
      setLng(e.latlng.lng)
      void reverseGeocode(e.latlng.lat, e.latlng.lng)
    })

    mapInstance.current = map
    // Force layout calc after Sheet animation finishes.
    setTimeout(() => map.invalidateSize(), 250)

    return () => {
      map.remove()
      mapInstance.current = null
      markerRef.current = null
      circleRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Sync marker + circle
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    if (lat !== null && lng !== null) {
      const pos = L.latLng(lat, lng)
      if (!markerRef.current) {
        markerRef.current = L.marker(pos).addTo(map)
      } else {
        markerRef.current.setLatLng(pos)
      }
      if (!circleRef.current) {
        circleRef.current = L.circle(pos, {
          radius: radiusKm * 1000,
          color: '#18181b',
          fillColor: '#18181b',
          fillOpacity: 0.1,
        }).addTo(map)
      } else {
        circleRef.current.setLatLng(pos)
        circleRef.current.setRadius(radiusKm * 1000)
      }
      map.panTo(pos)
    }
  }, [lat, lng, radiusKm])

  async function reverseGeocode(la: number, ln: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${ln}&format=json&accept-language=uk`,
      )
      const data = (await res.json()) as NominatimReverseResult
      const a = data.address
      if (a) {
        const inferredStreet = [a.road ?? a.pedestrian, a.house_number]
          .filter(Boolean)
          .join(', ')
        if (inferredStreet) setStreet(inferredStreet)
        const inferredCity = a.city ?? a.town ?? a.village ?? a.suburb
        if (inferredCity) setCity(inferredCity)
      }
    } catch {
      // Тиха помилка — координати все одно встановлені.
    }
  }

  async function handleSearch() {
    if (!query.trim()) return
    const country = profile.country as Country | null
    setSearching(true)
    setSearchError(null)
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
        'accept-language': 'uk',
      })
      if (country && country in COUNTRY_NOMINATIM_CODES) {
        params.set('countrycodes', COUNTRY_NOMINATIM_CODES[country])
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
      setLat(newLat)
      setLng(newLng)
      void reverseGeocode(newLat, newLng)
    } catch {
      setSearchError('Не вдалося звʼязатись з геокодером')
    } finally {
      setSearching(false)
    }
  }

  async function handleSave() {
    if (lat === null || lng === null) {
      setError('Оберіть точку на карті')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const next = await caretakerProfileService.updateCaretakerProfile({
        serviceLatitude: lat,
        serviceLongitude: lng,
        radiusKm,
        addressIsPublic,
        city: city || undefined,
        street: street || undefined,
        apartment: apartment || undefined,
        floor: floor || undefined,
        entrance: entrance || undefined,
      })
      onSaved(next)
      onOpenChange(false)
    } catch {
      setError('Не вдалося зберегти. Спробуйте ще раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Локація і зона роботи</SheetTitle>
          <SheetDescription>
            Точка на карті — звідки ви працюєте. Радіус — у яких межах
            погоджуєтесь брати замовлення.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="loc-search">Адреса</Label>
            <div className="flex gap-2">
              <Input
                id="loc-search"
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
            className="w-full h-[280px] rounded-lg border border-zinc-200"
          />
          <p className="text-xs text-zinc-500 -mt-2">
            Клікніть на карту, щоб встановити маркер вручну.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Радіус роботи</Label>
              <span className="text-sm font-medium text-zinc-900">
                {radiusKm} км
              </span>
            </div>
            <Slider
              value={[radiusKm]}
              onValueChange={(v) => setRadiusKm(v[0])}
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
                  <Label htmlFor="loc-city">Місто</Label>
                  <Input
                    id="loc-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Київ"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-street">Вулиця, будинок</Label>
                  <Input
                    id="loc-street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="вул. Хрещатик, 22"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="loc-apt">Квартира</Label>
                    <Input
                      id="loc-apt"
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loc-floor">Поверх</Label>
                    <Input
                      id="loc-floor"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loc-entrance">Підʼїзд</Label>
                    <Input
                      id="loc-entrance"
                      value={entrance}
                      onChange={(e) => setEntrance(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2">
            <input
              id="loc-public"
              type="checkbox"
              checked={addressIsPublic}
              onChange={(e) => setAddressIsPublic(e.target.checked)}
              className="mt-1"
            />
            <div className="flex flex-col">
              <Label htmlFor="loc-public" className="font-medium">
                Показувати точну адресу клієнтам
              </Label>
              <span className="text-xs text-zinc-500">
                Якщо вимкнено, клієнти бачитимуть приблизну зону. Точну адресу —
                лише після підтвердженого замовлення.
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Зберегти'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
