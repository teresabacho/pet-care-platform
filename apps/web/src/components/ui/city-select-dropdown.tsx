import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, MapPin, Loader2, X, Search } from 'lucide-react'
import {
  Country,
  COUNTRY_LABELS,
  COUNTRY_NOMINATIM_CODES,
  SUPPORTED_COUNTRIES,
  TOP_CITIES,
  type TopCity,
} from '@pet-care/shared'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface CityValue {
  label: string
  lat: number | null
  lng: number | null
  country: Country | null
}

export const EMPTY_CITY: CityValue = { label: '', lat: null, lng: null, country: null }

type GeoState = 'idle' | 'loading' | 'denied' | 'error'

interface NominatimSearchResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    country_code?: string
  }
}

interface NominatimReverseResult {
  address?: {
    city?: string
    town?: string
    village?: string
    country?: string
    country_code?: string
  }
}

type CitySelectDropdownProps = {
  label: string
  placeholder: string
  value: CityValue
  onChange: (value: CityValue) => void
  className?: string
}

const NOMINATIM_COUNTRY_CODES = SUPPORTED_COUNTRIES
  .map((c) => COUNTRY_NOMINATIM_CODES[c])
  .join(',')

function formatTopCity(c: TopCity): string {
  return `${c.nameUk}, ${COUNTRY_LABELS[c.country]}`
}

function countryFromCode(code: string | undefined): Country | null {
  if (!code) return null
  const upper = code.toUpperCase()
  return (SUPPORTED_COUNTRIES as string[]).includes(upper) ? (upper as Country) : null
}

function suggestionLabel(r: NominatimSearchResult): string {
  const a = r.address ?? {}
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.state ?? null
  const country = countryFromCode(a.country_code)
  if (city && country) return `${city}, ${COUNTRY_LABELS[country]}`
  return r.display_name
}

export function CitySelectDropdown({
  label,
  placeholder,
  value,
  onChange,
  className,
}: CitySelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<NominatimSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [geoState, setGeoState] = useState<GeoState>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  const topCityOptions = useMemo(
    () => TOP_CITIES.map((c) => ({ city: c, label: formatTopCity(c) })),
    [],
  )

  // Debounced Nominatim search starting from 2 characters.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          format: 'json',
          addressdetails: '1',
          limit: '8',
          countrycodes: NOMINATIM_COUNTRY_CODES,
          'accept-language': 'uk',
          featuretype: 'city',
        })
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
        const data = (await res.json()) as NominatimSearchResult[]
        setSuggestions(data)
      } catch {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  function selectTopCity(c: TopCity) {
    onChange({ label: formatTopCity(c), lat: c.lat, lng: c.lng, country: c.country })
    setQuery('')
    setOpen(false)
  }

  function selectSuggestion(r: NominatimSearchResult) {
    onChange({
      label: suggestionLabel(r),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      country: countryFromCode(r.address?.country_code),
    })
    setQuery('')
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation()
    onChange(EMPTY_CITY)
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoState('error')
      return
    }
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=uk`,
          )
          const data = (await res.json()) as NominatimReverseResult
          const a = data.address ?? {}
          const cityName = a.city ?? a.town ?? a.village ?? ''
          const country = countryFromCode(a.country_code)
          const countryName = country ? COUNTRY_LABELS[country] : (a.country ?? '')
          const labelStr = cityName && countryName ? `${cityName}, ${countryName}` : cityName || countryName
          if (labelStr) {
            onChange({ label: labelStr, lat: latitude, lng: longitude, country })
            setOpen(false)
          }
          setGeoState('idle')
        } catch {
          setGeoState('error')
        }
      },
      (err) => setGeoState(err.code === 1 ? 'denied' : 'error'),
      { timeout: 8000 },
    )
  }

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      if (geoState !== 'denied') setGeoState('idle')
    }
  }, [open, geoState])

  const trimmed = query.trim()
  const showSuggestions = trimmed.length >= 2
  const showTopCities = !showSuggestions

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-zinc-900 leading-none">{label}</span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="bg-white border border-zinc-200 rounded-md h-10 px-3 flex items-center justify-between w-full text-sm cursor-pointer text-left"
        >
          <span className={value.label ? 'text-zinc-900 truncate' : 'text-zinc-400'}>
            {value.label || placeholder}
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 ml-1">
            {value.label && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
                className="text-zinc-400 hover:text-zinc-700 p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={cn('w-4 h-4 text-zinc-400 transition-transform', open && 'rotate-180')} />
          </span>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={4}
          className="w-80 p-0 gap-0"
        >
          <div className="p-2 border-b border-zinc-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введіть місто (від 2 літер)..."
                className="w-full h-8 pl-8 pr-7 text-sm rounded-md border border-zinc-200 bg-white outline-none focus:border-zinc-400 placeholder:text-zinc-400"
              />
              {isSearching && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 animate-spin" />
              )}
            </div>
          </div>

          <div className="max-h-[260px] overflow-y-auto">
            {showTopCities && (
              <div>
                <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-zinc-400 font-medium">
                  Популярні міста
                </p>
                {topCityOptions.map(({ city, label }) => (
                  <button
                    key={`${city.country}-${city.nameUk}`}
                    onClick={() => selectTopCity(city)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-50 transition-colors',
                      label === value.label && 'bg-zinc-100 font-medium',
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {showSuggestions && suggestions.length === 0 && !isSearching && (
              <p className="px-3 py-3 text-sm text-zinc-400">Нічого не знайдено</p>
            )}

            {showSuggestions && suggestions.map((r) => (
              <button
                key={r.place_id}
                onClick={() => selectSuggestion(r)}
                className="w-full text-left px-3 py-2 text-sm flex items-start gap-2 hover:bg-zinc-50 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />
                <span className="flex flex-col">
                  <span className="text-zinc-900">{suggestionLabel(r)}</span>
                  <span className="text-[11px] text-zinc-400 truncate max-w-[18rem]">{r.display_name}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-zinc-100 p-2">
            <button
              onClick={handleGeolocate}
              disabled={geoState === 'loading'}
              className="w-full flex items-center justify-center gap-2 h-8 px-3 rounded-md text-sm font-medium text-zinc-700 border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-60"
            >
              {geoState === 'loading'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <MapPin className="w-3.5 h-3.5" />}
              {geoState === 'loading' ? 'Визначаємо...' : 'Моє місце'}
            </button>

            <div className="min-h-[16px] mt-1">
              {geoState === 'denied' && (
                <p className="text-xs text-center text-red-500">
                  Ви заборонили доступ до місцезнаходження
                </p>
              )}
              {geoState === 'error' && (
                <p className="text-xs text-center text-red-500">
                  Не вдалося визначити місцезнаходження
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
