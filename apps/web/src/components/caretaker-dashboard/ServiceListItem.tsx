import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  PRICE_UNIT_LABELS,
  SERVICE_TYPE_LABELS,
} from '../../lib/caretaker-labels'
import type { ServiceOffering } from '../../types'

interface ServiceListItemProps {
  service: ServiceOffering
  onEdit?: (service: ServiceOffering) => void
  onDelete?: (service: ServiceOffering) => void
}

function formatTier(tier: NonNullable<ServiceOffering['tiers']>[number]): string {
  const price = `${Number(tier.basePrice)} грн`
  if (tier.durationMinutes) {
    return `${tier.durationMinutes} хв · ${price}`
  }
  return `${price} ${PRICE_UNIT_LABELS[tier.priceUnit]}`
}

export default function ServiceListItem({
  service,
  onEdit,
  onDelete,
}: ServiceListItemProps) {
  const tiers = service.tiers ?? []
  const addonsCount = service.addons?.length ?? 0

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900">
            {SERVICE_TYPE_LABELS[service.serviceType]}
          </h4>
          {service.description && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
              {service.description}
            </p>
          )}
          {tiers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tiers.map((t) => (
                <Badge key={t.id} variant="secondary" className="text-xs">
                  {formatTier(t)}
                </Badge>
              ))}
            </div>
          )}
          {addonsCount > 0 && (
            <p className="text-xs text-zinc-500 mt-2">
              + {addonsCount}{' '}
              {addonsCount === 1
                ? 'додаткова послуга'
                : addonsCount < 5
                  ? 'додаткові послуги'
                  : 'додаткових послуг'}
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEdit(service)}
              aria-label="Редагувати"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDelete(service)}
              aria-label="Видалити"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
