import { forwardRef } from 'react'
import { DayType, PriceUnit, ServiceType } from '@pet-care/shared'
import { cn } from '@/lib/utils'
import {
  ADDON_PRICE_UNIT_LABELS,
  CAT_SIZE_LABELS,
  DOG_SIZE_LABELS,
  PRICE_UNIT_LABELS,
} from '@/lib/caretaker-labels'
import type { ServiceOffering, ServiceTier } from '../../types'

const SERVICE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома',
  [ServiceType.BOARDING]: 'Перетримка',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринар',
}

const DAY_TYPE_LABELS: Record<DayType, string> = {
  [DayType.REGULAR]: 'Будні',
  [DayType.WEEKEND]: 'Вихідні',
  [DayType.HOLIDAY]: 'Свята',
}

interface PriceListProps {
  offering: ServiceOffering
  className?: string
}

function tierLabel(tier: ServiceTier): string {
  if (tier.priceUnit === PriceUnit.PER_DAY) {
    return tier.durationMinutes ? `${Math.round(tier.durationMinutes / 60 / 24)} доба(и)` : 'За добу'
  }
  if (tier.durationMinutes != null) {
    if (tier.durationMinutes >= 60 && tier.durationMinutes % 60 === 0) {
      const h = tier.durationMinutes / 60
      return `${h} год`
    }
    return `${tier.durationMinutes} хв`
  }
  return PRICE_UNIT_LABELS[tier.priceUnit]
}

function tierPriceText(tier: ServiceTier): string {
  const num = parseFloat(tier.basePrice)
  return `${num.toFixed(0)} грн`
}

const PriceList = forwardRef<HTMLElement, PriceListProps>(function PriceList(
  { offering, className },
  ref,
) {
  const tiers = offering.tiers ?? []
  const addons = offering.addons ?? []
  const surcharges = offering.sizeSurcharges ?? []

  // group tiers by dayType (REGULAR / WEEKEND / HOLIDAY)
  const tierGroups = new Map<DayType, ServiceTier[]>()
  for (const t of tiers) {
    const list = tierGroups.get(t.dayType) ?? []
    list.push(t)
    tierGroups.set(t.dayType, list)
  }

  return (
    <section ref={ref} className={cn('flex flex-col gap-4 scroll-mt-20', className)}>
      <h2 className="text-base font-semibold text-zinc-900">
        Послуги та ціни — {SERVICE_LABELS[offering.serviceType].toLowerCase()}
      </h2>

      {offering.description && (
        <p className="text-sm text-zinc-500">{offering.description}</p>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          Основні варіанти
        </span>
        {tiers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 italic">
            Тарифи ще не задані
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from(tierGroups.entries()).map(([dayType, list]) => (
              <div
                key={dayType}
                className="bg-white border border-zinc-200 rounded-lg overflow-hidden"
              >
                {tierGroups.size > 1 && (
                  <div className="px-4 py-2 text-[11px] uppercase tracking-wide text-zinc-500 bg-zinc-50 border-b border-zinc-100">
                    {DAY_TYPE_LABELS[dayType]}
                  </div>
                )}
                <ul className="flex flex-col divide-y divide-zinc-100">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-baseline justify-between gap-3 px-4 py-3 hover:bg-zinc-50/60 transition"
                    >
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-zinc-900">
                          {tierLabel(t)}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-semibold text-zinc-900 tabular-nums">
                          {tierPriceText(t)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {PRICE_UNIT_LABELS[t.priceUnit]}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-zinc-500">
          Ціни вказані для тваринки розміру MEDIUM. Інші розміри — з урахуванням
          доплат нижче.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          Доплати за розмір
        </span>
        {surcharges.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-500 italic">
            Доглядальник не вказав доплат — ціна не залежить від розміру.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 bg-white border border-zinc-200 rounded-lg overflow-hidden">
            {surcharges.map((s) => {
              const amount = parseFloat(s.surchargeAmount)
              const label =
                s.petSpecies === 'DOG'
                  ? DOG_SIZE_LABELS[s.size as keyof typeof DOG_SIZE_LABELS] ??
                    s.size
                  : CAT_SIZE_LABELS[s.size as keyof typeof CAT_SIZE_LABELS] ??
                    s.size
              const sign = amount > 0 ? '+' : amount < 0 ? '−' : ''
              const display = amount === 0 ? 'без зміни' : `${sign}${Math.abs(amount).toFixed(0)} грн`
              return (
                <li
                  key={s.id}
                  className="flex items-baseline justify-between gap-3 px-4 py-3"
                >
                  <span className="text-sm text-zinc-700">
                    {s.petSpecies === 'DOG' ? '🐕' : '🐈'} {label}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      amount > 0
                        ? 'text-zinc-900'
                        : amount < 0
                          ? 'text-emerald-700'
                          : 'text-zinc-500',
                    )}
                  >
                    {display}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          Додаткові послуги
        </span>
        {addons.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-500 italic">
            Доглядальник не додав додаткових послуг.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 bg-white border border-zinc-200 rounded-lg overflow-hidden">
            {addons.map((a) => {
              const price = parseFloat(a.price)
              return (
                <li
                  key={a.id}
                  className="flex items-baseline justify-between gap-3 px-4 py-3 hover:bg-zinc-50/60 transition"
                >
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-zinc-900">
                      {a.name}
                    </span>
                    {a.description && (
                      <span className="text-xs text-zinc-500">
                        {a.description}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-zinc-900 tabular-nums">
                      +{price.toFixed(0)} грн
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {ADDON_PRICE_UNIT_LABELS[a.priceUnit]}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
})

export default PriceList
