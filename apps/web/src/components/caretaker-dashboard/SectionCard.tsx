import type { ReactNode } from 'react'
import { Check, Circle, CircleDashed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SectionStatus = 'empty' | 'partial' | 'complete'

interface SectionCardProps {
  title: string
  description: string
  status: SectionStatus
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
}

const STATUS_ICON: Record<SectionStatus, typeof Check> = {
  complete: Check,
  partial: CircleDashed,
  empty: Circle,
}

const STATUS_COLOR: Record<SectionStatus, string> = {
  complete: 'text-emerald-600 bg-emerald-50',
  partial: 'text-amber-600 bg-amber-50',
  empty: 'text-zinc-400 bg-zinc-50',
}

export default function SectionCard({
  title,
  description,
  status,
  actionLabel,
  onAction,
  children,
}: SectionCardProps) {
  const Icon = STATUS_ICON[status]

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'rounded-full p-1.5 shrink-0 mt-0.5',
            STATUS_COLOR[status],
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
        {actionLabel && onAction && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAction}
            className="shrink-0"
          >
            {actionLabel}
          </Button>
        )}
      </div>
      {children && <div className="mt-3 ml-10">{children}</div>}
    </div>
  )
}
