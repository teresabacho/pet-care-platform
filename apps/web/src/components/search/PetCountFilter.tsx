import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PetCounts = Record<string, number>

export const PET_TYPE_OPTIONS = [
  { value: 'dog', label: 'Собака', emoji: '🐕' },
  { value: 'cat', label: 'Кіт', emoji: '🐈' },
  { value: 'rodent', label: 'Гризун', emoji: '🐹' },
  { value: 'bird', label: 'Птах', emoji: '🦜' },
  { value: 'other', label: 'Інша', emoji: '🐾' },
] as const

interface PetCountFilterProps {
  value: PetCounts
  onChange: (next: PetCounts) => void
  className?: string
}

const MAX_COUNT = 10

export default function PetCountFilter({ value, onChange, className }: PetCountFilterProps) {
  function set(key: string, n: number) {
    const clamped = Math.max(0, Math.min(MAX_COUNT, n))
    onChange({ ...value, [key]: clamped })
  }

  const total = Object.values(value).reduce((s, n) => s + n, 0)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-900">Тварини</span>
        {total > 0 && (
          <span className="text-xs text-zinc-500">всього: {total}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {PET_TYPE_OPTIONS.map((opt) => {
          const count = value[opt.value] ?? 0
          const isActive = count > 0
          return (
            <div
              key={opt.value}
              className={cn(
                'flex items-center justify-between rounded-md px-2.5 py-2 transition',
                isActive ? 'bg-zinc-50' : 'hover:bg-zinc-50',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{opt.emoji}</span>
                <span className="text-sm text-zinc-900">{opt.label}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Зменшити кількість: ${opt.label}`}
                  onClick={() => set(opt.value, count - 1)}
                  disabled={count === 0}
                  className={cn(
                    'w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-700 transition',
                    count === 0
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-zinc-400 hover:text-zinc-900',
                  )}
                >
                  <Minus className="w-3 h-3" />
                </button>

                <span
                  className={cn(
                    'min-w-[1.25rem] text-center text-sm tabular-nums',
                    isActive ? 'font-semibold text-zinc-900' : 'text-zinc-400',
                  )}
                >
                  {count}
                </span>

                <button
                  type="button"
                  aria-label={`Збільшити кількість: ${opt.label}`}
                  onClick={() => set(opt.value, count + 1)}
                  disabled={count >= MAX_COUNT}
                  className={cn(
                    'w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-700 transition',
                    count >= MAX_COUNT
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-zinc-400 hover:text-zinc-900',
                  )}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
