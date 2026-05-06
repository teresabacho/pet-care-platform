import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ServiceType } from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import LocationField, { type LocationValue } from './LocationField'
import DatePickerField, { type DateSelection } from './DatePickerField'

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома',
  [ServiceType.BOARDING]: 'Пансіон',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринар',
}

const PET_TYPE_OPTIONS = [
  { value: 'dog', label: 'Собака' },
  { value: 'cat', label: 'Кіт' },
  { value: 'hamster', label: 'Хомяк' },
  { value: 'other', label: 'Інше' },
]

interface SearchFormState {
  location: LocationValue
  petType: string
  serviceType: ServiceType
  dates: DateSelection
}

interface SearchFormProps {
  className?: string
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

async function geocodeLocation(label: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const params = new URLSearchParams({ q: label, format: 'json', limit: '1', email: 'petcare@example.com' })
    const res = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { 'Accept-Language': 'uk' } })
    const data = await res.json()
    if (data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export default function SearchForm({ className }: SearchFormProps) {
  const navigate = useNavigate()
  const [isSearching, setIsSearching] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const [form, setForm] = useState<SearchFormState>({
    location: { label: '', lat: null, lng: null },
    petType: 'dog',
    serviceType: ServiceType.WALKING,
    dates: { mode: 'flexible', from: null, to: null, timeOfDay: 'full' },
  })

  function update<K extends keyof SearchFormState>(key: K, val: SearchFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (key === 'location') setLocationError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSearching(true)
    setLocationError(null)

    let { lat, lng } = form.location

    if ((!lat || !lng) && form.location.label.trim()) {
      const coords = await geocodeLocation(form.location.label.trim())
      if (coords) {
        lat = coords.lat
        lng = coords.lng
      } else {
        setLocationError('Місто не знайдено. Перевірте назву або скористайтесь кнопкою «Поряд зі мною».')
        setIsSearching(false)
        return
      }
    }

    if (!lat || !lng) {
      setLocationError('Вкажіть місто або дозвольте доступ до геолокації.')
      setIsSearching(false)
      return
    }

    const params = new URLSearchParams({
      type: form.serviceType,
      petType: form.petType,
      lat: lat.toString(),
      lng: lng.toString(),
      radiusKm: '20',
    })

    if (form.dates.mode !== 'flexible' && form.dates.from) {
      params.set('dateFrom', form.dates.from.toISOString().split('T')[0])
      if (form.dates.to) params.set('dateTo', form.dates.to.toISOString().split('T')[0])
    }
    if (form.dates.timeOfDay !== 'full') {
      params.set('timeOfDay', form.dates.timeOfDay)
    }

    navigate(`/search?${params.toString()}`)
    setIsSearching(false)
  }

  const dividerClass = 'hidden md:block w-px self-stretch bg-border my-2'

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <div className="flex flex-col md:flex-row md:items-stretch bg-white rounded-2xl shadow-lg border border-border overflow-hidden">
        <div className="flex-[2] min-w-0">
          <label className="block text-xs font-semibold text-foreground px-3 pt-3 pb-0.5">Місце</label>
          <LocationField
            value={form.location}
            onChange={(val) => update('location', val)}
          />
        </div>

        <div className={dividerClass} />

        <div className="flex-1 min-w-0 px-3 py-2">
          <label className="block text-xs font-semibold text-foreground pb-0.5">Тип тваринки</label>
          <Select value={form.petType} onValueChange={(val) => update('petType', val)}>
            <SelectTrigger className="h-9 border-0 shadow-none px-0 text-sm focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PET_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={dividerClass} />

        <div className="flex-1 min-w-0 px-3 py-2">
          <label className="block text-xs font-semibold text-foreground pb-0.5">Послуга</label>
          <Select value={form.serviceType} onValueChange={(val) => update('serviceType', val as ServiceType)}>
            <SelectTrigger className="h-9 border-0 shadow-none px-0 text-sm focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][]).map(([type, label]) => (
                <SelectItem key={type} value={type}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={dividerClass} />

        <div className="flex-[1.5] min-w-0">
          <label className="block text-xs font-semibold text-foreground px-3 pt-2 pb-0">Дати</label>
          <DatePickerField
            value={form.dates}
            onChange={(val) => update('dates', val)}
          />
        </div>

        <div className="p-2 flex items-center">
          <Button
            type="submit"
            size="lg"
            disabled={isSearching}
            className="w-full md:w-auto rounded-xl h-12 px-6 text-base font-semibold"
          >
            <Search className="size-4 mr-2" />
            Знайти
          </Button>
        </div>
      </div>

      {locationError && (
        <p className="mt-2 text-sm text-destructive text-center">{locationError}</p>
      )}
    </form>
  )
}
