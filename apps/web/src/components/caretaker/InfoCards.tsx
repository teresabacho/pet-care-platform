import { LANGUAGE_LABELS } from '@pet-care/shared'
import { cn } from '@/lib/utils'
import type { CaretakerProfile } from '../../types'

interface InfoCardsProps {
  profile: CaretakerProfile
  className?: string
}

interface InfoCardItem {
  icon: string
  label: string
  value: string
  placeholder?: boolean
}

function buildItems(profile: CaretakerProfile): InfoCardItem[] {
  const langs =
    profile.languages.length > 0
      ? profile.languages.map((l) => LANGUAGE_LABELS[l]).join(', ')
      : '—'

  return [
    {
      icon: '🎓',
      label: 'Досвід',
      value:
        profile.experienceYears != null
          ? `${profile.experienceYears} р.`
          : '—',
    },
    {
      icon: profile.isVerified ? '✓' : '◌',
      label: 'Статус',
      value: profile.isVerified ? 'Перевірено' : 'Без верифікації',
    },
    { icon: '💬', label: 'Мови', value: langs },
    {
      icon: '🚗',
      label: 'Радіус',
      value: profile.radiusKm != null ? `${profile.radiusKm} км` : '—',
    },
    {
      icon: '⏱️',
      label: 'Час відповіді',
      value: '[доробляється]',
      placeholder: true,
    },
    {
      icon: '📋',
      label: 'Виконано',
      value: '[доробляється]',
      placeholder: true,
    },
  ]
}

export default function InfoCards({ profile, className }: InfoCardsProps) {
  const items = buildItems(profile)
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="text-base font-semibold text-zinc-900">Загальна інформація</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              'border rounded-lg p-3 flex items-start gap-2.5',
              item.placeholder
                ? 'bg-zinc-50 border-dashed border-zinc-300'
                : 'bg-white border-zinc-200',
            )}
          >
            <span className="text-lg leading-none mt-0.5">{item.icon}</span>
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                {item.label}
              </span>
              <span
                className={cn(
                  'text-sm font-medium truncate',
                  item.placeholder ? 'text-zinc-400 italic' : 'text-zinc-900',
                )}
              >
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
