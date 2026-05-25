import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-start justify-between text-left hover:bg-zinc-50"
      >
        <div className="flex-1 pr-4">
          <p className="text-sm font-medium text-zinc-900">{title}</p>
          {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-zinc-500 mt-0.5 transition-transform shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-200 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}
