import { useState } from 'react'
import { AlertCircle, CalendarCheck, Clock, Loader2 } from 'lucide-react'
import { caretakerProfileService } from '../../services/caretaker-profile.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CaretakerProfile } from '../../types'
import { cn } from '@/lib/utils'

interface AvailabilitySectionProps {
  profile: CaretakerProfile
  onSaved: (next: CaretakerProfile) => void
}

const DAY_MS = 24 * 60 * 60 * 1000
const PRESETS = [
  { days: 7, label: '+1 тиждень' },
  { days: 14, label: '+2 тижні' },
  { days: 30, label: '+1 місяць' },
  { days: 90, label: '+3 місяці' },
]

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toIsoDate(d: Date): string {
  // YYYY-MM-DD у локальному часі (без UTC-зсуву).
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

interface ComputedStatus {
  tone: 'empty' | 'ok' | 'warning' | 'expired'
  message: string
  daysLeft: number | null
}

function computeStatus(filledUntil: Date | null): ComputedStatus {
  if (!filledUntil) {
    return { tone: 'empty', message: 'Календар не заповнено', daysLeft: null }
  }
  const today = startOfDay(new Date())
  const target = startOfDay(filledUntil)
  const daysLeft = Math.round((target.getTime() - today.getTime()) / DAY_MS)
  if (daysLeft < 0) {
    return {
      tone: 'expired',
      message: `Прострочено ${Math.abs(daysLeft)} ${pluralDays(Math.abs(daysLeft))} тому`,
      daysLeft,
    }
  }
  if (daysLeft <= 1) {
    return {
      tone: 'warning',
      message:
        daysLeft === 0
          ? 'Календар закінчується сьогодні'
          : 'Календар закінчується завтра',
      daysLeft,
    }
  }
  return {
    tone: 'ok',
    message: `Доступність відкрита ще на ${daysLeft} ${pluralDays(daysLeft)}`,
    daysLeft,
  }
}

function pluralDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дні'
  return 'днів'
}

export function AvailabilitySection({
  profile,
  onSaved,
}: AvailabilitySectionProps) {
  const filledUntil = profile.availabilityFilledUntil
    ? new Date(profile.availabilityFilledUntil)
    : null
  const updatedAt = profile.availabilityUpdatedAt
    ? new Date(profile.availabilityUpdatedAt)
    : null
  const status = computeStatus(filledUntil)

  const [draft, setDraft] = useState<string>(
    filledUntil ? toIsoDate(filledUntil) : '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const todayIso = toIsoDate(new Date())

  async function save(targetIso: string) {
    if (!targetIso) return
    setBusy(true)
    setError(null)
    try {
      const next = await caretakerProfileService.updateCaretakerProfile({
        availabilityFilledUntil: targetIso,
      })
      onSaved(next)
    } catch {
      setError('Не вдалося зберегти. Спробуйте ще раз.')
    } finally {
      setBusy(false)
    }
  }

  function handlePreset(days: number) {
    const target = startOfDay(new Date())
    target.setDate(target.getDate() + days)
    const iso = toIsoDate(target)
    setDraft(iso)
    void save(iso)
  }

  const toneClass: Record<ComputedStatus['tone'], string> = {
    empty: 'border-zinc-200 bg-zinc-50 text-zinc-700',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-rose-300 bg-rose-50 text-rose-900',
    expired: 'border-rose-300 bg-rose-50 text-rose-900',
  }
  const toneIcon =
    status.tone === 'ok' ? (
      <CalendarCheck className="w-5 h-5" />
    ) : status.tone === 'empty' ? (
      <Clock className="w-5 h-5" />
    ) : (
      <AlertCircle className="w-5 h-5" />
    )

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-zinc-900">
          Календар доступності
        </h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Вкажіть дату, до якої гарантуєте, що приймаєте замовлення. Ми
          періодично нагадуватимемо її продовжити.
        </p>
      </header>

      <div
        role="status"
        className={cn(
          'rounded-lg border p-4 flex items-start gap-3',
          toneClass[status.tone],
        )}
      >
        <div className="shrink-0 mt-0.5">{toneIcon}</div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{status.message}</p>
          {filledUntil && (
            <p className="text-xs">
              Заповнено до <strong>{formatHuman(filledUntil)}</strong>
              {updatedAt && (
                <>
                  {' · '}останнє оновлення {formatHuman(updatedAt)}
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Швидке оновлення</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.days}
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => handlePreset(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="avail-date">Або оберіть конкретну дату</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="avail-date"
            type="date"
            value={draft}
            min={todayIso}
            onChange={(e) => setDraft(e.target.value)}
            className="w-48"
          />
          <Button
            type="button"
            disabled={busy || !draft || draft < todayIso}
            onClick={() => save(draft)}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Зберегти'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </section>
  )
}
