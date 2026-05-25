import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  X,
} from 'lucide-react'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { uk } from 'date-fns/locale'
import {
  AVAILABILITY_SLOTS_ORDER,
  AVAILABILITY_SLOT_LABELS,
  AvailabilitySlot,
} from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { caretakerProfileService } from '../../services/caretaker-profile.service'
import {
  availabilityService,
  type AvailabilityDayPayload,
} from '../../services/availability.service'
import type { CaretakerProfile } from '../../types'
import { cn } from '@/lib/utils'

interface AvailabilitySectionProps {
  profile: CaretakerProfile
  onSaved: (next: CaretakerProfile) => void
}

function toIsoDate(d: Date): string {
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function formatHuman(d: Date): string {
  return d.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

type DraftMap = Record<string, Set<AvailabilitySlot>>

function rowsToDraft(
  rows: { date: string; slot: AvailabilitySlot }[],
): DraftMap {
  const map: DraftMap = {}
  for (const r of rows) {
    if (!map[r.date]) map[r.date] = new Set()
    map[r.date].add(r.slot)
  }
  return map
}

function draftEqualsBaseline(
  draft: DraftMap,
  baseline: DraftMap,
  visibleDates: string[],
): boolean {
  for (const date of visibleDates) {
    const a = draft[date] ?? new Set<AvailabilitySlot>()
    const b = baseline[date] ?? new Set<AvailabilitySlot>()
    if (a.size !== b.size) return false
    for (const slot of a) {
      if (!b.has(slot)) return false
    }
  }
  return true
}

export function AvailabilitySection({
  profile,
  onSaved,
}: AvailabilitySectionProps) {
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(today, { weekStartsOn: 1 }),
  )
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )
  const visibleDates = useMemo(() => days.map(toIsoDate), [days])

  const [baseline, setBaseline] = useState<DraftMap>({})
  const [draft, setDraft] = useState<DraftMap>({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const from = visibleDates[0]
    const to = visibleDates[6]
    setLoading(true)
    setError(null)
    availabilityService
      .list(profile.id, from, to)
      .then((rows) => {
        if (cancelled) return
        const map = rowsToDraft(rows)
        setBaseline(map)
        setDraft(structuredCloneDraft(map))
      })
      .catch(() => {
        if (cancelled) return
        setError('Не вдалося завантажити календар.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [profile.id, visibleDates])

  const updatedAt = profile.availabilityUpdatedAt
    ? new Date(profile.availabilityUpdatedAt)
    : null

  const monthLabel = useMemo(() => {
    const lastDay = days[6]
    if (weekStart.getMonth() === lastDay.getMonth()) {
      return format(weekStart, 'LLLL yyyy', { locale: uk })
    }
    return `${format(weekStart, 'LLL', { locale: uk })} – ${format(lastDay, 'LLL yyyy', { locale: uk })}`
  }, [weekStart, days])

  const canGoBack = weekStart > startOfWeek(today, { weekStartsOn: 1 })
  const dirty = !draftEqualsBaseline(draft, baseline, visibleDates)

  function shiftWeek(delta: number) {
    setWeekStart((prev) => addDays(prev, delta * 7))
  }

  function toggle(date: string, slot: AvailabilitySlot) {
    setDraft((prev) => {
      const next: DraftMap = { ...prev }
      const set = new Set(next[date] ?? [])
      if (set.has(slot)) set.delete(slot)
      else set.add(slot)
      next[date] = set
      return next
    })
  }

  function fillDay(date: string, full: boolean) {
    setDraft((prev) => {
      const next = { ...prev }
      next[date] = new Set(full ? AVAILABILITY_SLOTS_ORDER : [])
      return next
    })
  }

  function reset() {
    setDraft(structuredCloneDraft(baseline))
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const payload: AvailabilityDayPayload[] = visibleDates.map((date) => ({
        date,
        slots: Array.from(draft[date] ?? new Set()),
      }))
      await availabilityService.setMine(payload)
      const updated = await caretakerProfileService.getMyCaretakerProfile()
      if (updated) onSaved(updated)
      const refreshed = await availabilityService.list(
        profile.id,
        visibleDates[0],
        visibleDates[6],
      )
      const map = rowsToDraft(refreshed)
      setBaseline(map)
      setDraft(structuredCloneDraft(map))
    } catch {
      setError('Не вдалося зберегти. Спробуйте ще раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-zinc-900">
          Календар доступності
        </h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Позначайте, в які слоти ви готові приймати замовлення. Кожен слот —
          інтервал годин у вибраний день.
        </p>
      </header>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-start gap-3">
        <div className="shrink-0 mt-0.5 text-zinc-700">
          {updatedAt ? (
            <CalendarCheck className="w-5 h-5" />
          ) : (
            <Clock className="w-5 h-5" />
          )}
        </div>
        <div className="text-sm text-zinc-700">
          {updatedAt ? (
            <>Останнє оновлення розкладу: <strong>{formatHuman(updatedAt)}</strong></>
          ) : (
            <>Розклад ще не редагували. Заповніть слоти на найближчі тижні.</>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-900 capitalize">
          {monthLabel}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            disabled={!canGoBack}
            className={cn(
              'w-8 h-8 rounded-md border border-zinc-200 flex items-center justify-center text-zinc-700 transition',
              canGoBack ? 'hover:bg-zinc-50' : 'opacity-40 cursor-not-allowed',
            )}
            aria-label="Попередній тиждень"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="w-8 h-8 rounded-md border border-zinc-200 flex items-center justify-center text-zinc-700 hover:bg-zinc-50 transition"
            aria-label="Наступний тиждень"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 text-[12px]">
        <div />
        {days.map((d) => {
          const iso = toIsoDate(d)
          const isToday = isSameDay(d, today)
          const isPast = d < today
          const allOn =
            (draft[iso]?.size ?? 0) === AVAILABILITY_SLOTS_ORDER.length
          return (
            <div key={iso} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full flex flex-col items-center py-1 rounded',
                  isToday && 'bg-zinc-900 text-white',
                  isPast && !isToday && 'text-zinc-300',
                  !isPast && !isToday && 'text-zinc-700',
                )}
              >
                <span className="uppercase text-[10px] tracking-wide">
                  {format(d, 'EEEEEE', { locale: uk })}
                </span>
                <span
                  className={cn(
                    'font-semibold',
                    isToday ? 'text-white' : 'text-zinc-900',
                  )}
                >
                  {format(d, 'd')}
                </span>
              </div>
              {!isPast && (
                <button
                  type="button"
                  onClick={() => fillDay(iso, !allOn)}
                  disabled={busy || loading}
                  className="text-[10px] text-zinc-500 hover:text-zinc-900 transition"
                >
                  {allOn ? 'очистити' : 'весь день'}
                </button>
              )}
            </div>
          )
        })}

        {AVAILABILITY_SLOTS_ORDER.map((slot) => (
          <div key={slot} className="contents">
            <div className="flex items-center justify-end pr-1 text-[11px] text-zinc-500 tabular-nums">
              {AVAILABILITY_SLOT_LABELS[slot]}
            </div>
            {days.map((d) => {
              const iso = toIsoDate(d)
              const isPast = d < today
              const available = draft[iso]?.has(slot) ?? false
              return (
                <button
                  key={`${slot}-${iso}`}
                  type="button"
                  disabled={isPast || busy || loading}
                  onClick={() => toggle(iso, slot)}
                  className={cn(
                    'aspect-square rounded flex items-center justify-center transition border',
                    isPast
                      ? 'bg-zinc-50 text-zinc-300 border-transparent cursor-not-allowed'
                      : available
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-zinc-100 text-zinc-400 border-zinc-200 hover:bg-zinc-200',
                  )}
                  title={
                    isPast
                      ? 'Минулий час'
                      : available
                        ? `Вільно: ${format(d, 'EEEE, d MMM', { locale: uk })}, ${AVAILABILITY_SLOT_LABELS[slot]}`
                        : 'Зайнято'
                  }
                  aria-pressed={available}
                >
                  {!isPast &&
                    (available ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <X className="w-3 h-3" />
                    ))}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />
            вільно
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-100 border border-zinc-200" />
            зайнято
          </span>
        </div>
        {loading && (
          <span className="flex items-center gap-1 text-zinc-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            завантаження…
          </span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || !dirty}
          onClick={reset}
        >
          Скасувати
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy || !dirty}
          onClick={save}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Зберегти тиждень'
          )}
        </Button>
      </div>
    </section>
  )
}

function structuredCloneDraft(map: DraftMap): DraftMap {
  const next: DraftMap = {}
  for (const k of Object.keys(map)) {
    next[k] = new Set(map[k])
  }
  return next
}
