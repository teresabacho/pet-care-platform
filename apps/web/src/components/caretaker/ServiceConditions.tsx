import { ServiceType } from '@pet-care/shared'
import { cn } from '@/lib/utils'
import type { ServiceOffering } from '../../types'

const SERVICE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'вигулу',
  [ServiceType.PET_SITTING]: 'догляду вдома',
  [ServiceType.BOARDING]: 'перетримки',
  [ServiceType.GROOMING]: 'грумінгу',
  [ServiceType.VET_VISIT]: 'вет-візиту',
}

interface ServiceConditionsProps {
  offering: ServiceOffering
  className?: string
}

export default function ServiceConditions({
  offering,
  className,
}: ServiceConditionsProps) {
  const inclusions = offering.inclusions ?? []
  const sorted = [...inclusions].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="text-base font-semibold text-zinc-900">
        Умови {SERVICE_LABELS[offering.serviceType]}
      </h2>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 italic">
          [доробляється: доглядальник ще не вказав, що входить у послугу]
        </div>
      ) : (
        <ul className="bg-white border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100">
          {sorted.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0" />
              <span className="text-sm text-zinc-700 leading-relaxed">
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
