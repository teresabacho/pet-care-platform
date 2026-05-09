import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  COUNTRY_LABELS,
  COUNTRY_NOMINATIM_CODES,
  Country,
  SUPPORTED_COUNTRIES,
} from '@pet-care/shared'
import { useCaretakerOnboardingStore } from '../../store/caretakerOnboardingStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface NominatimSearchResult {
  lat: string
  lon: string
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

// Адреса проживання користувача (User-level). Без карти — просто текстовий
// пошук через Nominatim, який заповнює street/city/country. Карта (Step 3)
// потрібна лише для адреси послуг, де нам важлива точка для геопошуку.
export function UserAddressSection() {
  const { formData, setField } = useCaretakerOnboardingStore()
  const {
    userCountry,
    userAddressLabel,
    userStreet,
    userApartment,
    userFloor,
    userEntrance,
  } = formData

  const selectedCountry = SUPPORTED_COUNTRIES.includes(userCountry as Country)
    ? (userCountry as Country)
    : null

  const [query, setQuery] = useState(userAddressLabel)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleSearch = async () => {
    if (!query.trim() || !selectedCountry) return
    setSearching(true)
    setSearchError(null)
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '1',
        countrycodes: COUNTRY_NOMINATIM_CODES[selectedCountry],
        'accept-language': 'uk',
      })
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
      const data = (await res.json()) as NominatimSearchResult[]
      if (data.length === 0) {
        setSearchError('Адресу не знайдено — спробуйте інше формулювання')
        return
      }
      const [first] = data
      setField('userAddressLabel', first.display_name)
      setQuery(first.display_name)
      const a = first.address
      if (a) {
        const inferredStreet = [a.road ?? a.pedestrian, a.house_number]
          .filter(Boolean)
          .join(', ')
        if (inferredStreet) setField('userStreet', inferredStreet)
        const inferredCity = a.city ?? a.town ?? a.village ?? a.suburb
        if (inferredCity) setField('userCity', inferredCity)
        if (a.country_code) setField('userCountry', a.country_code.toUpperCase())
      }
    } catch {
      setSearchError('Не вдалося звʼязатись з геокодером')
    } finally {
      setSearching(false)
    }
  }

  const handleCountryChange = (next: Country) => {
    setField('userCountry', next)
    setField('userAddressLabel', '')
    setField('userStreet', '')
    setField('userCity', '')
    setQuery('')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="userCountry">Країна проживання</Label>
        <Select
          value={selectedCountry ?? undefined}
          onValueChange={(v) => handleCountryChange(v as Country)}
        >
          <SelectTrigger id="userCountry">
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

      <div className="space-y-1.5">
        <Label htmlFor="userAddress">Адреса</Label>
        <div className="flex gap-2">
          <Input
            id="userAddress"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              selectedCountry
                ? 'Наприклад, Київ, вул. Хрещатик, 22'
                : 'Спершу оберіть країну'
            }
            disabled={!selectedCountry}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
          />
          <Button
            type="button"
            onClick={handleSearch}
            disabled={searching || !selectedCountry}
            variant="outline"
          >
            {searching ? 'Шукаю…' : 'Знайти'}
          </Button>
        </div>
        {searchError && <p className="text-sm text-destructive">{searchError}</p>}
        {userAddressLabel && !searchError && (
          <p className="text-xs text-zinc-500">{userAddressLabel}</p>
        )}
      </div>

      <div className="border border-zinc-200 rounded-lg">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <span>Уточнити адресу (опціонально)</span>
          <ChevronDown
            className={cn('w-4 h-4 transition-transform', showDetails && 'rotate-180')}
          />
        </button>
        {showDetails && (
          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-zinc-200">
            <div className="space-y-1.5">
              <Label htmlFor="userStreet">Вулиця, будинок</Label>
              <Input
                id="userStreet"
                value={userStreet}
                onChange={(e) => setField('userStreet', e.target.value)}
                placeholder="вул. Хрещатик, 22"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="userApartment">Квартира</Label>
                <Input
                  id="userApartment"
                  value={userApartment}
                  onChange={(e) => setField('userApartment', e.target.value)}
                  placeholder="42"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="userFloor">Поверх</Label>
                <Input
                  id="userFloor"
                  value={userFloor}
                  onChange={(e) => setField('userFloor', e.target.value)}
                  placeholder="5"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="userEntrance">Підʼїзд</Label>
                <Input
                  id="userEntrance"
                  value={userEntrance}
                  onChange={(e) => setField('userEntrance', e.target.value)}
                  placeholder="2"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
