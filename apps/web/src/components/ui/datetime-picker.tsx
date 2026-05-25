import { useState } from 'react'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value: Date | undefined
  onChange: (value: Date) => void
  minDate?: Date
  placeholder?: string
  className?: string
  id?: string
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Оберіть дату і час',
  className,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)

  const hours = value ? pad(value.getHours()) : '12'
  const minutes = value ? pad(value.getMinutes()) : '00'
  const timeStr = `${hours}:${minutes}`

  function handleDateSelect(date: Date | undefined) {
    if (!date) return
    const next = new Date(date)
    if (value) {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0)
    } else {
      next.setHours(12, 0, 0, 0)
    }
    onChange(next)
  }

  function handleTimeChange(time: string) {
    const [hh, mm] = time.split(':').map((s) => parseInt(s, 10))
    if (Number.isNaN(hh) || Number.isNaN(mm)) return
    const next = value ? new Date(value) : new Date()
    next.setHours(hh, mm, 0, 0)
    onChange(next)
  }

  const display = value
    ? format(value, "d MMM yyyy, HH:mm", { locale: uk })
    : null

  const minMidnight = minDate
    ? new Date(
        minDate.getFullYear(),
        minDate.getMonth(),
        minDate.getDate(),
      )
    : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        className={cn(
          'bg-white border border-zinc-200 rounded-md h-10 px-3 flex items-center justify-between w-full text-sm cursor-pointer text-left',
          className,
        )}
      >
        <span className={display ? 'text-zinc-900' : 'text-zinc-400'}>
          {display ?? placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" sideOffset={4} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          locale={uk}
          disabled={minMidnight ? { before: minMidnight } : undefined}
          defaultMonth={value ?? new Date()}
        />
        <div className="flex items-center gap-2 border-t border-zinc-100 p-3">
          <label
            htmlFor={`${id ?? 'dtp'}-time`}
            className="text-xs text-zinc-500"
          >
            Час
          </label>
          <Input
            id={`${id ?? 'dtp'}-time`}
            type="time"
            value={timeStr}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="h-8 w-28"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto bg-zinc-900 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 transition"
          >
            Готово
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
