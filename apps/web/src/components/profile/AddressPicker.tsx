import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import {
  Country,
  COUNTRY_LABELS,
  COUNTRY_NOMINATIM_CODES,
  SUPPORTED_COUNTRIES,
} from '@pet-care/shared'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface AddressValue {
  country: string | null
  city: string | null
  street: string | null
  apartment: string | null
  floor: string | null
  entrance: string | null
  latitude: number | null
  longitude: number | null
}

export const EMPTY_ADDRESS: AddressValue = {
  country: null,
  city: null,
  street: null,
  apartment: null,
  floor: null,
  entrance: null,
  latitude: null,
  longitude: null,
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    house_number?: string
    road?: string
    pedestrian?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
    village?: string
    state?: string
    country_code?: string
    postcode?: string
  }
}

interface AddressPickerProps {
  value: AddressValue
  onChange: (next: AddressValue) => void
  className?: string
}

const NOMINATIM_COUNTRY_CODES = SUPPORTED_COUNTRIES
  .map((c) => COUNTRY_NOMINATIM_CODES[c])
  .join(',')

export default function AddressPicker({ value, onChange, className }: AddressPickerProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Pre-fill query from value when component receives a saved address.
  useEffect(() => {
    if (value.street || value.city) {
      const parts = [value.street, value.city].filter(Boolean).join(', ')
      setQuery(parts)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Click-outside handler.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  // Debounced search.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setSuggestions([])
      return
    }
    setIsLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          format: 'json',
          addressdetails: '1',
          limit: '6',
          countrycodes: NOMINATIM_COUNTRY_CODES,
        })
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { 'Accept-Language': 'uk' },
        })
        const data = (await res.json()) as NominatimResult[]
        setSuggestions(data)
      } catch {
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 350)
    return () => clearTimeout(timeout)
  }, [query])

  function applyResult(r: NominatimResult) {
    const a = r.address ?? {}
    const houseNumber = a.house_number ? ` ${a.house_number}` : ''
    const road = a.road ?? a.pedestrian ?? ''
    const street = road ? `${road}${houseNumber}`.trim() : null
    const city = a.city ?? a.town ?? a.village ?? a.suburb ?? a.state ?? null
    const upperCode = a.country_code?.toUpperCase()
    const country = upperCode && (SUPPORTED_COUNTRIES as string[]).includes(upperCode)
      ? (upperCode as Country)
      : null
    onChange({
      ...value,
      country,
      city,
      street,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    })
    setQuery([street, city].filter(Boolean).join(', '))
    setShowDropdown(false)
  }

  function patch<K extends keyof AddressValue>(key: K, v: AddressValue[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div ref={containerRef} className="relative flex flex-col gap-1.5">
        <Label htmlFor="address-search">Пошук адреси</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id="address-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Напр. вул. Хрещатик 22, Київ"
            className="pl-9 pr-9"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-popover border border-border rounded-md shadow-lg max-h-72 overflow-y-auto">
            {suggestions.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => applyResult(r)}
                className="w-full text-left px-3 py-2 text-sm flex items-start gap-2 hover:bg-accent transition border-b border-border last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-foreground">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {value.latitude != null && value.longitude != null && (
          <span className="text-xs text-muted-foreground">
            Координати збережено: {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
          </span>
        )}
      </div>

      {/* Structured fields — vertical, one per row */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="country">Країна</Label>
        <Select
          value={value.country ?? undefined}
          onValueChange={(v) => patch('country', v || null)}
        >
          <SelectTrigger id="country" className="w-full sm:max-w-xs">
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="city">Місто</Label>
        <Input
          id="city"
          type="text"
          value={value.city ?? ''}
          onChange={(e) => patch('city', e.target.value || null)}
          placeholder="Київ"
          className="w-full sm:max-w-xs"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="street">Вулиця і будинок</Label>
        <Input
          id="street"
          type="text"
          value={value.street ?? ''}
          onChange={(e) => patch('street', e.target.value || null)}
          placeholder="вул. Хрещатик 22"
        />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-foreground hover:text-foreground/80 select-none font-medium">
          Додаткові деталі (квартира, поверх, під'їзд)
        </summary>
        <div className="flex flex-col gap-3 mt-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apartment">Квартира</Label>
            <Input
              id="apartment"
              type="text"
              value={value.apartment ?? ''}
              onChange={(e) => patch('apartment', e.target.value || null)}
              placeholder="12"
              className="w-full sm:max-w-[200px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="floor">Поверх</Label>
            <Input
              id="floor"
              type="text"
              value={value.floor ?? ''}
              onChange={(e) => patch('floor', e.target.value || null)}
              placeholder="3"
              className="w-full sm:max-w-[200px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entrance">Під'їзд</Label>
            <Input
              id="entrance"
              type="text"
              value={value.entrance ?? ''}
              onChange={(e) => patch('entrance', e.target.value || null)}
              placeholder="2"
              className="w-full sm:max-w-[200px]"
            />
          </div>
        </div>
      </details>
    </div>
  )
}

export function formatAddress(addr: Partial<AddressValue>): string {
  const parts: string[] = []
  if (addr.street) parts.push(addr.street)
  if (addr.apartment) parts.push(`кв. ${addr.apartment}`)
  if (addr.city) parts.push(addr.city)
  if (addr.country && (SUPPORTED_COUNTRIES as string[]).includes(addr.country)) {
    parts.push(COUNTRY_LABELS[addr.country as Country])
  }
  return parts.join(', ')
}
