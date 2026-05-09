import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { ServiceOffering } from '../../types'
import { cn } from '@/lib/utils'

interface StatusBannerProps {
  services: ServiceOffering[]
}

export default function StatusBanner({ services }: StatusBannerProps) {
  const isActive = services.length > 0
  const Icon = isActive ? CheckCircle2 : AlertCircle

  return (
    <div
      role="status"
      className={cn(
        'rounded-lg border p-4 flex items-start gap-3',
        isActive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-amber-200 bg-amber-50 text-amber-900',
      )}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">
          {isActive
            ? 'Профіль активний — ви видимі в пошуку'
            : 'Профіль неактивний'}
        </p>
        {!isActive && (
          <p className="text-xs mt-0.5">
            Додайте хоча б одну послугу, щоб приймати замовлення.
          </p>
        )}
      </div>
    </div>
  )
}
