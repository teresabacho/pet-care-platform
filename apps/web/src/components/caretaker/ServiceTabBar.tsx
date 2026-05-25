import { ServiceType } from '@pet-care/shared'
import { cn } from '@/lib/utils'

const SERVICE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома',
  [ServiceType.BOARDING]: 'Перетримка',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринар',
}

const SERVICE_EMOJIS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: '🦮',
  [ServiceType.PET_SITTING]: '🏠',
  [ServiceType.BOARDING]: '🏡',
  [ServiceType.GROOMING]: '✂️',
  [ServiceType.VET_VISIT]: '💉',
}

interface ServiceTabBarProps {
  services: ServiceType[]
  active: ServiceType
  onChange: (service: ServiceType) => void
  className?: string
}

export default function ServiceTabBar({
  services,
  active,
  onChange,
  className,
}: ServiceTabBarProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 bg-zinc-50/95 backdrop-blur border-b border-zinc-200',
        className,
      )}
    >
      <div className="flex gap-1 overflow-x-auto py-2 -mx-1 px-1 scrollbar-thin">
        {services.map((s) => {
          const isActive = s === active
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium transition border',
                isActive
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400',
              )}
            >
              <span className="text-base leading-none">{SERVICE_EMOJIS[s]}</span>
              {SERVICE_LABELS[s]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
