import { useState } from 'react'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { Calendar as CalendarIcon, Sparkles, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type DateRangePopoverProps = {
  label: string
  placeholder: string
  value: DateRange | undefined
  flexible?: boolean
  onChange: (range: DateRange | undefined, flexible: boolean) => void
  className?: string
}

function formatLabel(range: DateRange | undefined): string | null {
  if (!range?.from) return null
  const from = format(range.from, 'd MMM', { locale: uk })
  if (!range.to) return from
  const to = format(range.to, 'd MMM', { locale: uk })
  return `${from} — ${to}`
}

export function DateRangePopover({
  label,
  placeholder,
  value,
  flexible = false,
  onChange,
  className,
}: DateRangePopoverProps) {
  const [open, setOpen] = useState(false)
  const display = flexible ? 'Гнучкі дати' : formatLabel(value)
  const hasValue = flexible || Boolean(value?.from)

  function handleClear(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation()
    onChange(undefined, false)
  }

  function handleRangeChange(range: DateRange | undefined) {
    // Picking a date turns flexible mode off automatically.
    onChange(range, false)
  }

  function toggleFlexible() {
    if (flexible) {
      onChange(undefined, false)
    } else {
      onChange(undefined, true)
      setOpen(false)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-zinc-900 leading-none">{label}</span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="bg-white border border-zinc-200 rounded-md h-10 px-3 flex items-center justify-between w-full text-sm cursor-pointer text-left"
        >
          <span className={display ? 'text-zinc-900 truncate flex items-center gap-1.5' : 'text-zinc-400'}>
            {flexible && <Sparkles className="w-3.5 h-3.5 text-zinc-500" />}
            {display ?? placeholder}
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 ml-1">
            {hasValue && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
                className="text-zinc-400 hover:text-zinc-700 p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <CalendarIcon className="w-4 h-4 text-zinc-400" />
          </span>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={4}
          className="w-auto p-0"
        >
          <button
            type="button"
            onClick={toggleFlexible}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b border-zinc-100 transition-colors text-left',
              flexible
                ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                : 'text-zinc-700 hover:bg-zinc-50',
            )}
          >
            <Sparkles className={cn('w-4 h-4', flexible ? 'text-white' : 'text-zinc-500')} />
            <span className="flex flex-col">
              <span className="font-medium">Я гнучкий з датами</span>
              <span className={cn('text-[11px]', flexible ? 'text-zinc-300' : 'text-zinc-400')}>
                Показати всіх доглядальників без фільтра по датах
              </span>
            </span>
          </button>

          <Calendar
            mode="range"
            selected={value}
            onSelect={handleRangeChange}
            numberOfMonths={2}
            locale={uk}
            disabled={{ before: today }}
            defaultMonth={value?.from ?? today}
          />
          <div className="flex items-center justify-between border-t border-zinc-100 p-2">
            <button
              type="button"
              onClick={() => onChange(undefined, false)}
              className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors px-2 py-1"
            >
              Очистити
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="bg-zinc-900 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Готово
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
