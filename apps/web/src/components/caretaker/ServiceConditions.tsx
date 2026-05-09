import { ServiceType } from '@pet-care/shared'
import { cn } from '@/lib/utils'
import { getServiceConditions } from '@/lib/caretaker-mocks'
import type { CaretakerProfile } from '../../types'

const SERVICE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'вигулу',
  [ServiceType.PET_SITTING]: 'догляду вдома',
  [ServiceType.BOARDING]: 'перетримки',
  [ServiceType.GROOMING]: 'грумінгу',
  [ServiceType.VET_VISIT]: 'вет-візиту',
}

interface ServiceConditionsProps {
  profile: CaretakerProfile
  serviceType: ServiceType
  className?: string
}

export default function ServiceConditions({ profile, serviceType, className }: ServiceConditionsProps) {
  const items = getServiceConditions(profile, serviceType)

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="text-base font-semibold text-zinc-900">
        Умови {SERVICE_LABELS[serviceType]}
      </h2>

      <ul className="bg-white border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100">
        {items.map((text) => (
          <li key={text} className="flex items-start gap-3 px-4 py-3">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0" />
            <span className="text-sm text-zinc-700 leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
