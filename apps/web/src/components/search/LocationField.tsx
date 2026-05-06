import { useState } from 'react'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface LocationValue {
  label: string
  lat: number | null
  lng: number | null
}

interface LocationFieldProps {
  value: LocationValue
  onChange: (value: LocationValue) => void
  className?: string
}

export default function LocationField({ value, onChange, className }: LocationFieldProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  function handleTextChange(text: string) {
    onChange({ label: text, lat: null, lng: null })
    setGeoError(null)
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoError('Геолокація не підтримується вашим браузером.')
      return
    }
    setIsLoading(true)
    setGeoError(null)



    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&email=petcare@example.com`,
            { headers: { 'Accept-Language': 'uk' } },
          )
          const data = await res.json()
          const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? 'Моє місцезнаходження'
          onChange({ label: city, lat: latitude, lng: longitude })
        } catch {
          onChange({ label: 'Моє місцезнаходження', lat: latitude, lng: longitude })
        }
        setIsLoading(false)
      },
      () => {
        setGeoError('Доступ до геолокації заблоковано. Введіть місто вручну.')
        setIsLoading(false)
      },
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value.label}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Місто, країна"
          className="pl-9 pr-28 h-12 text-sm border-0 shadow-none focus-visible:ring-0 rounded-none"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGeolocate}
          disabled={isLoading}
          className="absolute right-1 h-9 text-xs text-primary shrink-0"
        >
          {isLoading
            ? <Loader2 className="size-3.5 animate-spin" />
            : <MapPin className="size-3.5 mr-1" />
          }
          {isLoading ? 'Визначаю...' : 'Поряд зі мною'}
        </Button>
      </div>
      {geoError && (
        <p className="flex items-center gap-1.5 text-xs text-destructive px-3 pb-1">
          <AlertCircle className="size-3.5 shrink-0" />
          {geoError}
        </p>
      )}
    </div>
  )
}
