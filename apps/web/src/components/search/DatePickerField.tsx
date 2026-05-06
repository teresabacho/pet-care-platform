import { useState } from 'react'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type TimeOfDay = 'full' | 'morning' | 'afternoon' | 'evening'

export interface DateSelection {
  mode: 'flexible' | 'single' | 'range'
  from: Date | null
  to: Date | null
  timeOfDay: TimeOfDay
}

interface DatePickerFieldProps {
  value: DateSelection
  onChange: (value: DateSelection) => void
  className?: string
}

const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  full: 'Весь день',
  morning: 'Ранок (9:00–13:00)',
  afternoon: 'День (13:00–18:00)',
  evening: 'Вечір (18:00–22:00)',
}

function formatDateLabel(value: DateSelection): string {
  if (value.mode === 'flexible' || !value.from) return 'Будь-коли'
  if (value.mode === 'single') {
    return format(value.from, 'd MMM', { locale: uk })
  }
  if (value.to) {
    return `${format(value.from, 'd MMM', { locale: uk })} – ${format(value.to, 'd MMM', { locale: uk })}`
  }
  return format(value.from, 'd MMM', { locale: uk })
}

export default function DatePickerField({ value, onChange, className }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false)

  function handleSelect(range: DateRange | undefined) {
    if (!range) {
      onChange({ ...value, mode: 'flexible', from: null, to: null })
      return
    }
    onChange({
      ...value,
      mode: range.to ? 'range' : 'single',
      from: range.from ?? null,
      to: range.to ?? null,
    })
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full h-12 flex items-center gap-2 px-3 text-sm text-left',
              'hover:bg-accent/50 transition-colors',
              !value.from && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{formatDateLabel(value)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b flex gap-1">
            {(['flexible', 'single', 'range'] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={value.mode === mode ? 'default' : 'ghost'}
                className="text-xs h-7"
                onClick={() => {
                  onChange({ ...value, mode, from: null, to: null })
                }}
              >
                {mode === 'flexible' ? 'Гнучко' : mode === 'single' ? 'Один день' : 'Кілька днів'}
              </Button>
            ))}
          </div>

          {value.mode !== 'flexible' && (
            <Calendar
              mode="range"
              selected={{ from: value.from ?? undefined, to: value.to ?? undefined }}
              onSelect={handleSelect}
              disabled={{ before: new Date() }}
              numberOfMonths={value.mode === 'range' ? 2 : 1}
              locale={uk}
            />
          )}

          <div className="p-3 border-t grid grid-cols-2 gap-1">
            {(Object.entries(TIME_OF_DAY_LABELS) as [TimeOfDay, string][]).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={value.timeOfDay === key ? 'default' : 'ghost'}
                className="text-xs h-7 justify-start"
                onClick={() => onChange({ ...value, timeOfDay: key })}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="p-2 border-t flex justify-end">
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Готово
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
