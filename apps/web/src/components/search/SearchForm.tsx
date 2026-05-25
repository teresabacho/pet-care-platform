import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ServiceType } from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CitySelectDropdown, EMPTY_CITY, type CityValue } from '@/components/ui/city-select-dropdown'
import { cn } from '@/lib/utils'

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
  city: CityValue
  petType: string
  serviceType: ServiceType
}

interface SearchFormProps {
  className?: string
}

export default function SearchForm({ className }: SearchFormProps) {
  const navigate = useNavigate()
  const [locationError, setLocationError] = useState<string | null>(null)

  const [form, setForm] = useState<SearchFormState>({
    city: EMPTY_CITY,
    petType: 'dog',
    serviceType: ServiceType.WALKING,
  })

  function update<K extends keyof SearchFormState>(key: K, val: SearchFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (key === 'city') setLocationError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocationError(null)

    if (!form.city.label || form.city.lat == null || form.city.lng == null) {
      setLocationError('Виберіть місто зі списку або скористайтесь «Моє місце».')
      return
    }

    const params = new URLSearchParams({
      service: form.serviceType.toLowerCase(),
      pet: form.petType,
      city: form.city.label,
      lat: form.city.lat.toString(),
      lng: form.city.lng.toString(),
    })
    if (form.city.country) params.set('country', form.city.country)

    navigate(`/search?${params.toString()}`)
  }

  const dividerClass = 'hidden md:block w-px self-stretch bg-border my-2'

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <div className="flex flex-col md:flex-row md:items-stretch bg-white rounded-2xl shadow-lg border border-border overflow-hidden p-2 gap-2">
        <div className="flex-[2] min-w-0">
          <CitySelectDropdown
            label="Місце"
            placeholder="Місто, країна"
            value={form.city}
            onChange={(val) => update('city', val)}
          />
        </div>

        <div className={dividerClass} />

        <div className="flex-1 min-w-0 px-1">
          <label className="block text-sm font-medium text-zinc-900 leading-none mb-2">Тип тваринки</label>
          <Select value={form.petType} onValueChange={(val) => update('petType', val)}>
            <SelectTrigger className="h-10 text-sm">
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

        <div className="flex-1 min-w-0 px-1">
          <label className="block text-sm font-medium text-zinc-900 leading-none mb-2">Послуга</label>
          <Select value={form.serviceType} onValueChange={(val) => update('serviceType', val as ServiceType)}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][]).map(([type, label]) => (
                <SelectItem key={type} value={type}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto rounded-xl h-10 px-6 text-base font-semibold"
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
