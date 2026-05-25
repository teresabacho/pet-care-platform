import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { uk } from 'date-fns/locale'
import {
  AVAILABILITY_SLOTS_ORDER,
  AVAILABILITY_SLOT_LABELS,
} from '@pet-care/shared'
import {
  availabilityService,
  type AvailabilityRow,
} from '../../services/availability.service'
import { cn } from '@/lib/utils'

interface AvailabilityCalendarProps {
  caretakerId: string
  className?: string
}

function toIsoDate(d: Date): string {
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function AvailabilityCalendar({ caretakerId, className }: AvailabilityCalendarProps) {
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(today, { weekStartsOn: 1 }),
  )
  const [rows, setRows] = useState<AvailabilityRow[]>([])

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  useEffect(() => {
    let cancelled = false
    const from = toIsoDate(days[0])
    const to = toIsoDate(days[6])
    availabilityService
      .list(caretakerId, from, to)
      .then((res) => {
        if (!cancelled) setRows(res)
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [caretakerId, days])

  const availableSet = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      set.add(`${r.date}|${r.slot}`)
    }
    return set
  }, [rows])

  const monthLabel = useMemo(() => {
    const lastDay = days[6]
    if (weekStart.getMonth() === lastDay.getMonth()) {
      return format(weekStart, 'LLLL yyyy', { locale: uk })
    }
    return `${format(weekStart, 'LLL', { locale: uk })} – ${format(lastDay, 'LLL yyyy', { locale: uk })}`
  }, [weekStart, days])

  const canGoBack = weekStart > startOfWeek(today, { weekStartsOn: 1 })

  function shiftWeek(delta: number) {
    setWeekStart((prev) => addDays(prev, delta * 7))
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-900 capitalize">{monthLabel}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            disabled={!canGoBack}
            className={cn(
              'w-7 h-7 rounded-md border border-zinc-200 flex items-center justify-center text-zinc-700 transition',
              canGoBack ? 'hover:bg-zinc-50' : 'opacity-40 cursor-not-allowed',
            )}
            aria-label="Попередній тиждень"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="w-7 h-7 rounded-md border border-zinc-200 flex items-center justify-center text-zinc-700 hover:bg-zinc-50 transition"
            aria-label="Наступний тиждень"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[44px_repeat(7,1fr)] gap-0.5 text-[11px]">
        <div />
        {days.map((d) => {
          const isToday = isSameDay(d, today)
          const isPast = d < today
          return (
            <div
              key={d.toISOString()}
              className={cn(
                'flex flex-col items-center py-1 rounded',
                isToday && 'bg-zinc-900 text-white',
                isPast && !isToday && 'text-zinc-300',
                !isPast && !isToday && 'text-zinc-700',
              )}
            >
              <span className="uppercase text-[10px] tracking-wide">
                {format(d, 'EEEEEE', { locale: uk })}
              </span>
              <span className={cn('font-semibold', isToday ? 'text-white' : 'text-zinc-900')}>
                {format(d, 'd')}
              </span>
            </div>
          )
        })}

        {AVAILABILITY_SLOTS_ORDER.map((slot) => (
          <div key={slot} className="contents">
            <div className="flex items-center justify-end pr-1 text-[10px] text-zinc-500 tabular-nums">
              {AVAILABILITY_SLOT_LABELS[slot]}
            </div>
            {days.map((d) => {
              const isPast = d < today
              const iso = toIsoDate(d)
              const available = availableSet.has(`${iso}|${slot}`)
              return (
                <div
                  key={`${slot}-${iso}`}
                  className={cn(
                    'aspect-square rounded flex items-center justify-center transition',
                    isPast
                      ? 'bg-zinc-50 text-zinc-300'
                      : available
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-zinc-100 text-zinc-400',
                  )}
                  title={
                    isPast
                      ? 'Минулий час'
                      : available
                        ? `Вільно: ${format(d, 'EEEE, d MMM', { locale: uk })}, ${AVAILABILITY_SLOT_LABELS[slot]}`
                        : 'Зайнято'
                  }
                >
                  {!isPast &&
                    (available ? <Check className="w-3 h-3" /> : <X className="w-2.5 h-2.5" />)}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />
          вільно
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-zinc-100 border border-zinc-200" />
          зайнято
        </span>
      </div>
    </div>
  )
}
