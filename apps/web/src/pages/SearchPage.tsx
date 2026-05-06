import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ServiceType } from '@pet-care/shared'
import { SlidersHorizontal, Loader2, Search } from 'lucide-react'
import { serviceOfferingsService } from '../services/service-offerings.service'
import type { SearchResult } from '../types'
import CaretakerCard from '../components/CaretakerCard'
import SearchMap from '../components/search/SearchMap'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома',
  [ServiceType.BOARDING]: 'Пансіон',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринар',
}

type SortOption = 'price-asc' | 'price-desc' | 'experience-desc'

const SORT_LABELS: Record<SortOption, string> = {
  'price-asc': 'Ціна ↑',
  'price-desc': 'Ціна ↓',
  'experience-desc': 'Досвід',
}

function sortResults(results: SearchResult[], sort: SortOption): SearchResult[] {
  return [...results].sort((a, b) => {
    switch (sort) {
      case 'price-asc': return parseFloat(a.price) - parseFloat(b.price)
      case 'price-desc': return parseFloat(b.price) - parseFloat(a.price)
      case 'experience-desc': return (b.caretaker.experienceYears ?? 0) - (a.caretaker.experienceYears ?? 0)
    }
  })
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read initial values from URL
  const urlLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
  const urlLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null
  const urlType = (searchParams.get('type') as ServiceType | null) ?? null
  const urlRadius = searchParams.get('radiusKm') ? parseInt(searchParams.get('radiusKm')!) : 20

  // Filter state (local, synced to URL on search)
  const [serviceType, setServiceType] = useState<ServiceType | 'all'>(urlType ?? 'all')
  const [radiusKm, setRadiusKm] = useState(urlRadius)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const [sortOption, setSortOption] = useState<SortOption>('price-asc')
  const [activeTypeChip, setActiveTypeChip] = useState<ServiceType | 'all'>('all')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  // Results state
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const doSearch = useCallback(async (params: {
    lat: number | null
    lng: number | null
    type: ServiceType | 'all'
    radiusKm: number
  }) => {
    setIsLoading(true)
    setHasSearched(true)
    try {
      const data = await serviceOfferingsService.search({
        type: params.type !== 'all' ? params.type : undefined,
        lat: params.lat ?? undefined,
        lng: params.lng ?? undefined,
        radiusKm: params.lat != null ? params.radiusKm : undefined,
      })
      setResults(data)
      // Auto-set price range from results
      if (data.length > 0) {
        const prices = data.map((r) => parseFloat(r.price))
        setPriceRange([Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))])
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-search on mount if URL has coords
  useEffect(() => {
    if (urlLat != null && urlLng != null) {
      doSearch({ lat: urlLat, lng: urlLng, type: urlType ?? 'all', radiusKm: urlRadius })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleApplyFilters() {
    const newParams = new URLSearchParams(searchParams)
    if (serviceType !== 'all') newParams.set('type', serviceType)
    else newParams.delete('type')
    newParams.set('radiusKm', radiusKm.toString())
    setSearchParams(newParams, { replace: true })
    doSearch({ lat: urlLat, lng: urlLng, type: serviceType, radiusKm })
  }

  // Derive displayed results: filter by chip + price range, then sort
  const [priceLow, priceHigh] = priceRange
  const filtered = results
    .filter((r) => activeTypeChip === 'all' || r.serviceType === activeTypeChip)
    .filter((r) => {
      const p = parseFloat(r.price)
      return p >= priceLow && p <= priceHigh
    })
  const displayed = sortResults(filtered, sortOption)

  // Price range bounds from all results (not filtered)
  const allPrices = results.map((r) => parseFloat(r.price))
  const minPrice = allPrices.length ? Math.floor(Math.min(...allPrices)) : 0
  const maxPrice = allPrices.length ? Math.ceil(Math.max(...allPrices)) : 2000

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Left: filters + cards (40%) ── */}
      <div className="flex flex-col w-full md:w-[42%] shrink-0 border-r border-border bg-background overflow-hidden">

        {/* Filters panel */}
        <div className="border-b border-border p-4 flex flex-col gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="size-4 text-primary" />
            Фільтри
          </div>

          {/* Service type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Тип послуги</label>
            <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType | 'all')}>
              <SelectTrigger className="w-full text-sm h-9">
                <SelectValue placeholder="Всі послуги" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі послуги</SelectItem>
                {(Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][]).map(([v, label]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Radius */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Радіус</label>
              <Badge variant="secondary" className="text-xs">{radiusKm} км</Badge>
            </div>
            <Slider min={1} max={50} step={1} value={[radiusKm]} onValueChange={([v]) => setRadiusKm(v)} />
          </div>

          {/* Price range */}
          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ціна</label>
                <span className="text-xs text-muted-foreground">{priceLow}–{priceHigh} грн</span>
              </div>
              <Slider
                min={minPrice}
                max={maxPrice}
                step={10}
                value={priceRange}
                onValueChange={(v) => setPriceRange(v as [number, number])}
              />
            </div>
          )}

          <Button size="sm" onClick={handleApplyFilters} disabled={isLoading} className="w-full gap-2">
            {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            {isLoading ? 'Пошук...' : 'Застосувати'}
          </Button>
        </div>

        {/* Service type chips + sort */}
        {hasSearched && results.length > 0 && (
          <div className="border-b border-border px-4 py-2 flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant={activeTypeChip === 'all' ? 'default' : 'outline'}
              size="sm" className="h-7 text-xs rounded-full"
              onClick={() => setActiveTypeChip('all')}
            >
              Всі <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-3.5">{displayed.length}</Badge>
            </Button>
            {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[])
              .filter((t) => results.some((r) => r.serviceType === t))
              .map((t) => (
                <Button
                  key={t}
                  variant={activeTypeChip === t ? 'default' : 'outline'}
                  size="sm" className={cn('h-7 text-xs rounded-full', activeTypeChip !== t && 'text-muted-foreground')}
                  onClick={() => setActiveTypeChip(t)}
                >
                  {SERVICE_TYPE_LABELS[t]}
                </Button>
              ))}
            <div className="ml-auto">
              <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                <SelectTrigger className="h-7 text-xs w-32 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([v, label]) => (
                    <SelectItem key={v} value={v} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Cards list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <Search className="size-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Налаштуйте фільтри і натисніть «Застосувати»</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <Search className="size-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Нікого не знайдено</p>
              <p className="text-xs text-muted-foreground/60">Спробуйте збільшити радіус або змінити тип послуги</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayed.map((result) => (
                <div
                  key={result.id}
                  onMouseEnter={() => setHighlightedId(result.id)}
                  onMouseLeave={() => setHighlightedId(null)}
                >
                  <CaretakerCard result={result} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: map (60%) ── */}
      <div className="hidden md:block flex-1 relative">
        <SearchMap
          centerLat={urlLat}
          centerLng={urlLng}
          radiusKm={radiusKm}
          results={displayed}
          highlightedId={highlightedId}
        />
      </div>
    </div>
  )
}
