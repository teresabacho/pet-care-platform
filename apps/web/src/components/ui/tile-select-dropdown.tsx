import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type TileOption = {
  value: string
  label: string
  emoji: string
}

type TileSelectDropdownProps = {
  label: string
  placeholder: string
  options: TileOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TileSelectDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  className,
}: TileSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-zinc-900 leading-none">{label}</span>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          className="bg-white border border-zinc-200 rounded-md h-10 px-3 flex items-center justify-between w-full text-sm cursor-pointer"
        >
          <span className={selected ? 'text-zinc-900' : 'text-zinc-400'}>
            {selected ? `${selected.emoji} ${selected.label}` : placeholder}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-zinc-400 transition-transform', open && 'rotate-180')} />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="p-2 w-auto"
          align="start"
          sideOffset={4}
        >
          <div className="flex flex-wrap gap-2">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value === value ? '' : option.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 w-[140px] px-3 py-2.5 rounded-md border text-sm font-medium transition-colors cursor-pointer',
                  option.value === value
                    ? 'bg-zinc-100 border-zinc-200 text-zinc-900'
                    : 'bg-transparent border-zinc-200 text-zinc-900 hover:bg-zinc-50'
                )}
              >
                <span className="text-lg leading-none">{option.emoji}</span>
                <span className="text-center leading-snug">{option.label}</span>
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
