import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import {
  AddonPriceUnit,
  PriceUnit,
  ServiceType,
} from '@pet-care/shared'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Plus } from 'lucide-react'
import { usersService } from '../services/users.service'
import { serviceOfferingsService } from '../services/service-offerings.service'
import { petsService } from '../services/pets.service'
import { bookingsService } from '../services/bookings.service'
import {
  ADDON_PRICE_UNIT_LABELS,
  PRICE_UNIT_LABELS,
  SERVICE_TYPE_LABELS,
} from '@/lib/caretaker-labels'
import type {
  Pet,
  ServiceAddon,
  ServiceOffering,
  ServiceTier,
  UserPublic,
} from '../types'
import { cn } from '@/lib/utils'

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

function hoursBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.max(0, ms / (60 * 60 * 1000))
}

function addonMultiplier(
  unit: AddonPriceUnit,
  start: Date,
  end: Date,
): number {
  if (unit === AddonPriceUnit.PER_BOOKING) return 1
  if (unit === AddonPriceUnit.PER_DAY) return daysBetween(start, end)
  return 1 // PER_WALK — невідомо без segments, рахуємо як 1 для preview
}

export default function BookingCreatePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const caretakerId = searchParams.get('caretakerId')
  const initialServiceType =
    (searchParams.get('service') as ServiceType | null) ?? null

  const [caretaker, setCaretaker] = useState<UserPublic | null>(null)
  const [offerings, setOfferings] = useState<ServiceOffering[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)

  const [activeServiceType, setActiveServiceType] = useState<ServiceType | null>(
    initialServiceType,
  )
  const [activeTierId, setActiveTierId] = useState<string | null>(null)
  const [activePetId, setActivePetId] = useState<string | null>(null)
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())

  const now = useMemo(() => new Date(), [])
  const defaultStart = useMemo(() => {
    const d = new Date(now)
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return d
  }, [now])
  const defaultEnd = useMemo(() => {
    const d = new Date(defaultStart)
    d.setHours(d.getHours() + 1)
    return d
  }, [defaultStart])

  const [scheduledStart, setScheduledStart] = useState<Date>(defaultStart)
  const [scheduledEnd, setScheduledEnd] = useState<Date>(defaultEnd)
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!caretakerId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      usersService.getById(caretakerId),
      serviceOfferingsService.getByCaretaker(caretakerId).catch(() => []),
      petsService.getMyPets().catch(() => []),
    ])
      .then(([u, offs, myPets]) => {
        if (cancelled) return
        setCaretaker(u)
        setOfferings(offs)
        setPets(myPets)
        if (!activeServiceType && offs.length > 0) {
          setActiveServiceType(offs[0].serviceType)
        }
        if (myPets.length > 0) setActivePetId(myPets[0].id)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caretakerId])

  const activeOffering = useMemo(
    () =>
      offerings.find((o) => o.serviceType === activeServiceType) ?? null,
    [offerings, activeServiceType],
  )

  // Reset tier/addons when offering changes
  useEffect(() => {
    if (!activeOffering) {
      setActiveTierId(null)
      setSelectedAddonIds(new Set())
      return
    }
    const tiers = activeOffering.tiers ?? []
    setActiveTierId(tiers[0]?.id ?? null)
    setSelectedAddonIds(new Set())
  }, [activeOffering])

  const activeTier: ServiceTier | null = useMemo(() => {
    if (!activeOffering) return null
    const tiers = activeOffering.tiers ?? []
    return tiers.find((t) => t.id === activeTierId) ?? null
  }, [activeOffering, activeTierId])

  const activeAddons: ServiceAddon[] = useMemo(() => {
    if (!activeOffering) return []
    return (activeOffering.addons ?? []).filter((a) =>
      selectedAddonIds.has(a.id),
    )
  }, [activeOffering, selectedAddonIds])

  // Client-side price estimate (server computes the final price with surcharge).
  const priceEstimate = useMemo(() => {
    if (!activeTier) return null
    const base = parseFloat(activeTier.basePrice)
    let total = base
    if (activeTier.priceUnit === PriceUnit.PER_DAY) {
      total = base * daysBetween(scheduledStart, scheduledEnd)
    } else if (activeTier.priceUnit === PriceUnit.PER_HOUR) {
      total = base * Math.max(1, Math.ceil(hoursBetween(scheduledStart, scheduledEnd)))
    }
    for (const a of activeAddons) {
      total +=
        parseFloat(a.price) *
        addonMultiplier(a.priceUnit, scheduledStart, scheduledEnd)
    }
    return Math.round(total)
  }, [activeTier, activeAddons, scheduledStart, scheduledEnd])

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!activeOffering || !activeTier || !activePetId || !activeServiceType) {
      setError('Заповніть усі поля')
      return
    }
    if (
      Number.isNaN(scheduledStart.getTime()) ||
      Number.isNaN(scheduledEnd.getTime())
    ) {
      setError('Некоректна дата')
      return
    }
    if (scheduledStart < new Date()) {
      setError('Початок має бути в майбутньому')
      return
    }
    if (scheduledEnd <= scheduledStart) {
      setError('Кінець має бути після початку')
      return
    }
    if (!caretakerId) return

    setSubmitting(true)
    try {
      const booking = await bookingsService.create({
        caretakerId,
        petId: activePetId,
        serviceType: activeServiceType,
        tierId: activeTier.id,
        addonIds: Array.from(selectedAddonIds),
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        notes: notes.trim() || undefined,
      })
      navigate(`/bookings?highlight=${booking.id}`)
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Не вдалося створити замовлення'
      setError(typeof message === 'string' ? message : 'Помилка')
    } finally {
      setSubmitting(false)
    }
  }

  if (!caretakerId) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-zinc-500 mb-4">Не вказано виконавця.</p>
        <Link to="/search" className="text-zinc-900 underline">
          Перейти до пошуку
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!caretaker || offerings.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-zinc-500 mb-4">
          У цього виконавця ще немає послуг для бронювання.
        </p>
        <Link to="/search" className="text-zinc-900 underline">
          Повернутись до пошуку
        </Link>
      </div>
    )
  }

  const availableServiceTypes = Array.from(
    new Set(offerings.map((o) => o.serviceType)),
  )
  const fullName =
    caretaker.firstName || caretaker.lastName
      ? `${caretaker.firstName ?? ''} ${caretaker.lastName ?? ''}`.trim()
      : caretaker.email
  const initials = (
    (caretaker.firstName?.[0] ?? '') +
    (caretaker.lastName?.[0] ?? caretaker.email[0])
  ).toUpperCase()

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">
        Бронювання послуги
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Заповніть деталі — виконавець підтвердить ваше замовлення.
      </p>

      {/* Caretaker header */}
      <Link
        to={`/caretaker/${caretaker.id}`}
        className="flex items-center gap-3 mb-6 p-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition"
      >
        <Avatar className="w-12 h-12">
          {caretaker.avatarUrl && (
            <AvatarImage src={caretaker.avatarUrl} alt={fullName} />
          )}
          <AvatarFallback className="bg-zinc-100 text-zinc-700 font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-zinc-900">
            {fullName}
          </span>
          <span className="text-xs text-zinc-500">Профіль виконавця →</span>
        </div>
      </Link>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Service type */}
        <section>
          <Label className="text-sm font-semibold text-zinc-900">Послуга</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {availableServiceTypes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveServiceType(s)}
                className={cn(
                  'rounded-lg border p-3 text-sm text-left transition',
                  activeServiceType === s
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400',
                )}
              >
                {SERVICE_TYPE_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        {/* Tier */}
        {activeOffering && (
          <section>
            <Label className="text-sm font-semibold text-zinc-900">Тариф</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {(activeOffering.tiers ?? []).map((t) => {
                const checked = t.id === activeTierId
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTierId(t.id)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition',
                      checked
                        ? 'border-zinc-900 bg-zinc-50'
                        : 'border-zinc-200 bg-white hover:border-zinc-400',
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-900">
                        {t.durationMinutes
                          ? t.durationMinutes >= 60 && t.durationMinutes % 60 === 0
                            ? `${t.durationMinutes / 60} год`
                            : `${t.durationMinutes} хв`
                          : PRICE_UNIT_LABELS[t.priceUnit]}
                      </span>
                      <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                        {parseFloat(t.basePrice).toFixed(0)} грн
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {PRICE_UNIT_LABELS[t.priceUnit]}
                    </p>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              Ціни вказані для тваринки розміру MEDIUM. Кінцева ціна може
              включати доплату за розмір.
            </p>
          </section>
        )}

        {/* Pet */}
        <section>
          <Label className="text-sm font-semibold text-zinc-900">Тваринка</Label>
          {pets.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
              У вас ще немає доданих тваринок.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {pets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePetId(p.id)}
                  className={cn(
                    'rounded-lg border p-3 text-left flex items-center gap-3 transition',
                    p.id === activePetId
                      ? 'border-zinc-900 bg-zinc-50'
                      : 'border-zinc-200 bg-white hover:border-zinc-400',
                  )}
                >
                  <Avatar className="w-10 h-10">
                    {p.photoUrl && <AvatarImage src={p.photoUrl} alt={p.name} />}
                    <AvatarFallback className="bg-zinc-200 text-zinc-700 text-xs">
                      {p.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {p.name}
                    </p>
                    {p.breed && (
                      <p className="text-[11px] text-zinc-500 truncate">
                        {p.breed}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          <Link
            to={`/pets/new?redirect=${encodeURIComponent(
              `/bookings/new?${searchParams.toString()}`,
            )}`}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-zinc-700 hover:text-zinc-900 underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Додати тваринку
          </Link>
        </section>

        {/* Dates */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-start" className="text-sm font-semibold text-zinc-900">
              Початок
            </Label>
            <DateTimePicker
              id="bk-start"
              value={scheduledStart}
              onChange={(d) => {
                setScheduledStart(d)
                if (scheduledEnd <= d) {
                  // Auto-shift end if it became <= start
                  const nextEnd = new Date(d)
                  nextEnd.setHours(nextEnd.getHours() + 1)
                  setScheduledEnd(nextEnd)
                }
              }}
              minDate={now}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-end" className="text-sm font-semibold text-zinc-900">
              Кінець
            </Label>
            <DateTimePicker
              id="bk-end"
              value={scheduledEnd}
              onChange={setScheduledEnd}
              minDate={scheduledStart}
            />
          </div>
        </section>

        {/* Addons */}
        {activeOffering && (activeOffering.addons?.length ?? 0) > 0 && (
          <section>
            <Label className="text-sm font-semibold text-zinc-900">
              Додаткові послуги
            </Label>
            <div className="flex flex-col gap-2 mt-2">
              {(activeOffering.addons ?? []).map((a) => {
                const checked = selectedAddonIds.has(a.id)
                return (
                  <label
                    key={a.id}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition',
                      checked
                        ? 'border-zinc-900 bg-zinc-50'
                        : 'border-zinc-200 bg-white hover:border-zinc-400',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAddon(a.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-900">
                          {a.name}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          +{parseFloat(a.price).toFixed(0)} грн
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {a.description}
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {ADDON_PRICE_UNIT_LABELS[a.priceUnit]}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </section>
        )}

        {/* Notes */}
        <section className="flex flex-col gap-1.5">
          <Label htmlFor="bk-notes" className="text-sm font-semibold text-zinc-900">
            Нотатки (опціонально)
          </Label>
          <Textarea
            id="bk-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Особливі побажання, контактні деталі, тощо…"
            rows={3}
          />
        </section>

        {/* Summary */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-700">Орієнтовна вартість</span>
            <span className="text-xl font-semibold tabular-nums">
              {priceEstimate !== null ? `${priceEstimate} грн` : '—'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Кінцеву ціну (з урахуванням розміру тваринки) розраховує сервер при
            створенні замовлення.
          </p>
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md p-3">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Скасувати
          </Button>
          <Button
            type="submit"
            disabled={
              submitting ||
              !activeTier ||
              !activePetId ||
              !activeServiceType
            }
            className="bg-zinc-900 hover:bg-zinc-800 text-white"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Підтвердити бронювання'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
