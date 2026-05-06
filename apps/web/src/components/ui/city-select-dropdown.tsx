import { useState, useRef, useEffect } from 'react'
import { ChevronDown, MapPin, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const POPULAR_CITIES = [
  'Київ, Україна',
  'Львів, Україна',
  'Харків, Україна',
  'Одеса, Україна',
  'Дніпро, Україна',
  'Запоріжжя, Україна',
  'Вінниця, Україна',
  'Полтава, Україна',
  'Чернівці, Україна',
  'Івано-Франківськ, Україна',
  'Тернопіль, Україна',
  'Луцьк, Україна',
  'Ужгород, Україна',
  'Хмельницький, Україна',
  'Суми, Україна',
  'Рівне, Україна',
  'Кропивницький, Україна',
  'Миколаїв, Україна',
  'Херсон, Україна',
  'Житомир, Україна',
  'Варшава, Польща',
  'Краків, Польща',
  'Берлін, Німеччина',
  'Відень, Австрія',
  'Прага, Чехія',
  'Братислава, Словаччина',
  'Будапешт, Угорщина',
  'Бухарест, Румунія',
  'Рига, Латвія',
  'Вільнюс, Литва',
  'Таллінн, Естонія',
]

type GeoState = 'idle' | 'loading' | 'denied' | 'error'

type CitySelectDropdownProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  className?: string
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
  const [geoState, setGeoState] = useState<GeoState>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim().length === 0
    ? POPULAR_CITIES
    : POPULAR_CITIES.filter(c => c.toLowerCase().includes(query.toLowerCase()))

  function handleSelect(city: string) {
    onChange(city)
    setQuery('')
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoState('error')
      return
    }
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=uk`,
            { headers: { 'User-Agent': 'PawMate/1.0' } }
          )
          const data = await res.json() as {
            address?: { city?: string; town?: string; village?: string; country?: string }
          }
          const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? ''
          const country = data.address?.country ?? ''
          const label = city && country ? `${city}, ${country}` : city || country
          if (label) {
            onChange(label)
            setOpen(false)
          }
          setGeoState('idle')
        } catch {
          setGeoState('error')
        }
      },
      err => setGeoState(err.code === 1 ? 'denied' : 'error'),
      { timeout: 8000 }
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

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-zinc-900 leading-none">{label}</span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="bg-white border border-zinc-200 rounded-md h-10 px-3 flex items-center justify-between w-full text-sm cursor-pointer text-left"
        >
          <span className={value ? 'text-zinc-900 truncate' : 'text-zinc-400'}>
            {value || placeholder}
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 ml-1">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={e => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
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
          className="w-72 p-0 gap-0"
        >
          {/* search input */}
          <div className="p-2 border-b border-zinc-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Введіть місто..."
              className="w-full h-8 px-2.5 text-sm rounded-md border border-zinc-200 bg-white outline-none focus:border-zinc-400 placeholder:text-zinc-400"
            />
          </div>

          {/* city list */}
          <div className="max-h-[180px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-zinc-400">Нічого не знайдено</p>
            ) : (
              filtered.map(city => (
                <button
                  key={city}
                  onClick={() => handleSelect(city)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-50 transition-colors',
                    city === value && 'bg-zinc-100 font-medium'
                  )}
                >
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                  {city}
                </button>
              ))
            )}
          </div>

          {/* geolocation — always visible */}
          <div className="border-t border-zinc-100 p-2">
            <button
              onClick={handleGeolocate}
              disabled={geoState === 'loading'}
              className="w-full flex items-center justify-center gap-2 h-8 px-3 rounded-md text-sm font-medium text-zinc-700 border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-60"
            >
              {geoState === 'loading'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <MapPin className="w-3.5 h-3.5" />
              }
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
