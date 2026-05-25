import { cn } from '@/lib/utils'

interface ChipOption<T extends string> {
  value: T
  label: string
}

interface ChipMultiSelectProps<T extends string> {
  options: ChipOption<T>[]
  value: T[]
  onChange: (next: T[]) => void
  className?: string
}

export default function ChipMultiSelect<T extends string>({
  options,
  value,
  onChange,
  className,
}: ChipMultiSelectProps<T>) {
  const toggle = (v: T) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v))
    else onChange([...value, v])
  }
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const active = value.includes(o.value)
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => toggle(o.value)}
            className={cn(
              'px-3 py-1.5 rounded-full border text-sm transition-colors',
              active
                ? 'bg-zinc-900 border-zinc-900 text-white'
                : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-500',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
