import { useEffect, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface PriceRangeFilterProps {
  min: number
  max: number
  value: [number, number]
  onChange: (next: [number, number]) => void
  className?: string
}

export default function PriceRangeFilter({
  min,
  max,
  value,
  onChange,
  className,
}: PriceRangeFilterProps) {
  const [lowText, setLowText] = useState(String(value[0]))
  const [highText, setHighText] = useState(String(value[1]))

  useEffect(() => {
    setLowText(String(value[0]))
    setHighText(String(value[1]))
  }, [value])

  function commit(low: number, high: number) {
    const lo = Math.max(min, Math.min(low, high))
    const hi = Math.min(max, Math.max(low, high))
    onChange([lo, hi])
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-900">Ціна за день</span>
        <span className="text-xs text-zinc-500">
          {value[0]}–{value[1]} грн
        </span>
      </div>

      <Slider
        min={min}
        max={max}
        step={10}
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
        className="w-full"
      />

      <div className="flex items-center gap-2">
        <label className="flex-1 flex flex-col gap-1">
          <span className="text-[11px] uppercase text-zinc-500 tracking-wide">Від</span>
          <div className="relative">
            <input
              type="number"
              min={min}
              max={max}
              value={lowText}
              onChange={(e) => setLowText(e.target.value)}
              onBlur={() => commit(parseInt(lowText) || min, value[1])}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              className="w-full h-9 px-2.5 pr-8 text-sm border border-zinc-200 rounded-md bg-white outline-none focus:border-zinc-400"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
              грн
            </span>
          </div>
        </label>

        <span className="text-zinc-400 mt-5">—</span>

        <label className="flex-1 flex flex-col gap-1">
          <span className="text-[11px] uppercase text-zinc-500 tracking-wide">До</span>
          <div className="relative">
            <input
              type="number"
              min={min}
              max={max}
              value={highText}
              onChange={(e) => setHighText(e.target.value)}
              onBlur={() => commit(value[0], parseInt(highText) || max)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              className="w-full h-9 px-2.5 pr-8 text-sm border border-zinc-200 rounded-md bg-white outline-none focus:border-zinc-400"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
              грн
            </span>
          </div>
        </label>
      </div>
    </div>
  )
}
