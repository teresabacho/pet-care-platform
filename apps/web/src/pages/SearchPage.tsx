import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Search, SlidersHorizontal } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  ServiceType,
  Country,
  SUPPORTED_COUNTRIES,
  COUNTRY_NOMINATIM_CODES,
} from '@pet-care/shared'
import { format, parseISO } from 'date-fns'
import { serviceOfferingsService } from '../services/service-offerings.service'
import type { SearchResult } from '../types'
import CaretakerCard, { type CaretakerCardData } from '../components/CaretakerCard'
import SearchMap from '../components/search/SearchMap'
import SearchTopBar, { type TopBarValue } from '../components/search/SearchTopBar'
import { EMPTY_CITY, type CityValue } from '../components/ui/city-select-dropdown'
import PriceRangeFilter from '../components/search/PriceRangeFilter'
import PetCountFilter, { type PetCounts } from '../components/search/PetCountFilter'

const SERVICE_VALUE_TO_TYPE: Record<string, ServiceType> = {
  walking: ServiceType.WALKING,
  sitting: ServiceType.PET_SITTING,
  daycare: ServiceType.PET_SITTING,
  boarding: ServiceType.BOARDING,
  grooming: ServiceType.GROOMING,
  vet: ServiceType.VET_VISIT,
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_COUNTRY_CODES = SUPPORTED_COUNTRIES
  .map((c) => COUNTRY_NOMINATIM_CODES[c])
  .join(',')

async function geocodeCity(label: string): Promise<{ lat: number; lng: number } | null> {
  if (!label.trim()) return null
  try {
    const params = new URLSearchParams({
      q: label,
      format: 'json',
      limit: '1',
      countrycodes: NOMINATIM_COUNTRY_CODES,
    })
    const res = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { 'Accept-Language': 'uk' } })
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    if (data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

function readUrlValue(params: URLSearchParams): TopBarValue {
  const fromStr = params.get('from')
  const toStr = params.get('to')
  const dates: DateRange | undefined =
    fromStr || toStr
      ? {
          from: fromStr ? parseISO(fromStr) : undefined,
          to: toStr ? parseISO(toStr) : undefined,
        }
      : undefined

  const cityLabel = params.get('city') ?? ''
  const lat = params.get('lat')
  const lng = params.get('lng')
  const countryStr = params.get('country')
  const country = countryStr && (SUPPORTED_COUNTRIES as string[]).includes(countryStr)
    ? (countryStr as Country)
    : null

  const city: CityValue = cityLabel
    ? {
        label: cityLabel,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        country,
      }
    : EMPTY_CITY

  return {
    pet: params.get('pet') ?? '',
    service: params.get('service') ?? '',
    city,
    dates,
    flexibleDates: params.get('flexible') === '1',
  }
}

function groupByCaretaker(results: SearchResult[]): CaretakerCardData[] {
  const map = new Map<string, CaretakerCardData>()
  for (const r of results) {
    const id = r.caretaker.id
    let entry = map.get(id)
    if (!entry) {
      entry = { caretaker: r.caretaker, offerings: [] }
      map.set(id, entry)
    }
    entry.offerings.push(r)
  }
  return Array.from(map.values())
}

function petTopBarToAcceptedKey(
  pet: string,
): 'dog' | 'cat' | 'rodent' | 'bird' | 'other' | null {
  switch (pet) {
    case 'dog':
      return 'dog'
    case 'cat':
      return 'cat'
    case 'rodent':
      return 'rodent'
    case 'bird':
      return 'bird'
    case 'other':
      return 'other'
    default:
      return null
  }
}

function offeringsAcceptPet(
  offerings: SearchResult[] | CaretakerCardData['offerings'],
  pet: string,
): boolean {
  const key = petTopBarToAcceptedKey(pet)
  if (!key) return true
  return offerings.some((o) => {
    const policy = (o.walkingPolicy ??
      o.petSittingPolicy ??
      o.boardingPolicy ??
      o.groomingPolicy ??
      o.vetVisitPolicy) as
      | {
          acceptedDogSizes: string[]
          acceptedCatSizes: string[]
          acceptedRodentTypes?: string[]
          acceptedBirdTypes?: string[]
          acceptedOtherPetTypes?: string[]
        }
      | null
      | undefined
    if (!policy) return false
    if (key === 'dog') return policy.acceptedDogSizes.length > 0
    if (key === 'cat') return policy.acceptedCatSizes.length > 0
    if (key === 'rodent') return (policy.acceptedRodentTypes?.length ?? 0) > 0
    if (key === 'bird') return (policy.acceptedBirdTypes?.length ?? 0) > 0
    return (policy.acceptedOtherPetTypes?.length ?? 0) > 0
  })
}

function minBasePrice(o: SearchResult): number | null {
  const tiers = o.tiers ?? []
  if (tiers.length === 0) return null
  let best: number | null = null
  for (const t of tiers) {
    const v = parseFloat(t.basePrice)
    if (Number.isNaN(v)) continue
    if (best === null || v < best) best = v
  }
  return best
}

function minPrice(c: CaretakerCardData): number | null {
  let best: number | null = null
  for (const o of c.offerings) {
    const v = minBasePrice(o as SearchResult)
    if (v === null) continue
    if (best === null || v < best) best = v
  }
  return best
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [topBar, setTopBar] = useState<TopBarValue>(() => readUrlValue(searchParams))

  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)

  const [radiusKm, setRadiusKm] = useState<number>(25)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const [petCounts, setPetCounts] = useState<PetCounts>({})
  const [highlightedCaretakerId, setHighlightedCaretakerId] = useState<string | null>(null)

  const serviceType: ServiceType | null = topBar.service
    ? SERVICE_VALUE_TO_TYPE[topBar.service] ?? null
    : null

  async function runSearch(value: TopBarValue, overrideRadius?: number) {
    setIsLoading(true)
    setHasSearched(true)

    let coords: { lat: number; lng: number } | null =
      value.city.lat != null && value.city.lng != null
        ? { lat: value.city.lat, lng: value.city.lng }
        : null

    if (!coords && value.city.label) {
      coords = await geocodeCity(value.city.label)
    }
    if (coords) setCenter(coords)

    const effectiveRadius = overrideRadius ?? radiusKm

    try {
      const data = await serviceOfferingsService.search({
        type: value.service ? SERVICE_VALUE_TO_TYPE[value.service] : undefined,
        lat: coords?.lat,
        lng: coords?.lng,
        radiusKm: coords ? effectiveRadius : undefined,
      })
      setResults(data)

      if (data.length > 0) {
        const grouped = groupByCaretaker(data)
        const prices = grouped
          .map(minPrice)
          .filter((p): p is number => p !== null)
        if (prices.length > 0) {
          setPriceRange([
            Math.floor(Math.min(...prices)),
            Math.ceil(Math.max(...prices)),
          ])
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Initial search on mount if URL has pet/service/city
  useEffect(() => {
    const initial = readUrlValue(searchParams)
    if (initial.pet || initial.service || initial.city.label) {
      runSearch(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTopBarSubmit() {
    const next = new URLSearchParams()
    if (topBar.pet) next.set('pet', topBar.pet)
    if (topBar.service) next.set('service', topBar.service)
    if (topBar.city.label) {
      next.set('city', topBar.city.label)
      if (topBar.city.lat != null) next.set('lat', topBar.city.lat.toString())
      if (topBar.city.lng != null) next.set('lng', topBar.city.lng.toString())
      if (topBar.city.country) next.set('country', topBar.city.country)
    }
    if (topBar.flexibleDates) {
      next.set('flexible', '1')
    } else {
      if (topBar.dates?.from) next.set('from', format(topBar.dates.from, 'yyyy-MM-dd'))
      if (topBar.dates?.to) next.set('to', format(topBar.dates.to, 'yyyy-MM-dd'))
    }
    setSearchParams(next, { replace: true })
    runSearch(topBar)
  }

  // Group + filter
  const grouped = useMemo(() => groupByCaretaker(results), [results])

  const allMinPrices = grouped
    .map(minPrice)
    .filter((p): p is number => p !== null)
  const sliderMin = allMinPrices.length ? Math.floor(Math.min(...allMinPrices)) : 0
  const sliderMax = allMinPrices.length ? Math.ceil(Math.max(...allMinPrices)) : 2000

  const filtered = useMemo(() => {
    return grouped.filter((c) => {
      const p = minPrice(c)
      if (p !== null && (p < priceRange[0] || p > priceRange[1])) {
        return false
      }
      if (topBar.pet) {
        if (!offeringsAcceptPet(c.offerings, topBar.pet)) return false
      }
      return true
    })
  }, [grouped, priceRange, topBar.pet])

  // Map shows one marker per caretaker — dedupe to the cheapest offering of each.
  const mapResults = useMemo(() => {
    const visibleIds = new Set(filtered.map((c) => c.caretaker.id))
    const byCaretaker = new Map<string, SearchResult>()
    for (const r of results) {
      if (!visibleIds.has(r.caretaker.id)) continue
      const existing = byCaretaker.get(r.caretaker.id)
      const rPrice = minBasePrice(r)
      const ePrice = existing ? minBasePrice(existing) : null
      if (!existing || (rPrice !== null && (ePrice === null || rPrice < ePrice))) {
        byCaretaker.set(r.caretaker.id, r)
      }
    }
    return Array.from(byCaretaker.values())
  }, [results, filtered])

  const highlightedOfferingId = useMemo(
    () => mapResults.find((r) => r.caretaker.id === highlightedCaretakerId)?.id ?? null,
    [mapResults, highlightedCaretakerId],
  )

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-50">
      <SearchTopBar value={topBar} onChange={setTopBar} onSubmit={handleTopBarSubmit} />

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_minmax(0,42%)]">
        {/* Filters column */}
        <aside className="hidden lg:flex flex-col gap-5 p-4 overflow-y-auto bg-white border-r border-zinc-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <SlidersHorizontal className="w-4 h-4 text-zinc-700" />
            Фільтри
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-700">
              Радіус пошуку
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[5, 10, 25, 50, 100].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRadiusKm(r)
                    if (hasSearched) runSearch(topBar, r)
                  }}
                  className={
                    'px-2.5 py-1 rounded-full border text-xs transition ' +
                    (radiusKm === r
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400')
                  }
                >
                  {r} км
                </button>
              ))}
            </div>
            {!center && (
              <p className="text-[11px] text-zinc-400">
                Вкажіть місто, щоб увімкнути радіус
              </p>
            )}
          </div>

          <div className="border-t border-zinc-100" />

          <PriceRangeFilter
            min={sliderMin}
            max={sliderMax || 2000}
            value={priceRange}
            onChange={setPriceRange}
          />

          <div className="border-t border-zinc-100" />

          <PetCountFilter value={petCounts} onChange={setPetCounts} />
        </aside>

        {/* Cards column */}
        <section className="overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
              <Search className="w-10 h-10 text-zinc-300" />
              <p className="text-sm text-zinc-500">
                Заповніть поля зверху і натисніть «Шукати»
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
              <Search className="w-10 h-10 text-zinc-300" />
              <p className="text-sm text-zinc-500">Нікого не знайдено</p>
              <p className="text-xs text-zinc-400">Спробуйте розширити фільтри</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-3xl mx-auto">
              <p className="text-sm text-zinc-500">
                Знайдено {filtered.length}{' '}
                {filtered.length === 1
                  ? 'доглядальника'
                  : filtered.length >= 2 && filtered.length <= 4
                    ? 'доглядальники'
                    : 'доглядальників'}
              </p>
              {filtered.map((c) => (
                <CaretakerCard
                  key={c.caretaker.id}
                  data={c}
                  highlightedServiceType={serviceType}
                  onHover={setHighlightedCaretakerId}
                />
              ))}
            </div>
          )}
        </section>

        {/* Map column */}
        <div className="hidden lg:block relative">
          <SearchMap
            centerLat={center?.lat ?? null}
            centerLng={center?.lng ?? null}
            radiusKm={radiusKm}
            results={mapResults}
            highlightedId={highlightedOfferingId}
          />
        </div>
      </div>
    </div>
  )
}
