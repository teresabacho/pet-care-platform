import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { NO_BREED_LABEL } from '@/lib/dog-breeds'

/**
 * Sentinel value that means «Без породи / метис» (explicit choice — distinct from untouched).
 */
export const MIXED_BREED = 'mixed'

interface BreedSelectProps {
  /** '' = untouched, 'mixed' = no breed, otherwise = breed name. */
  value: string
  onChange: (next: string) => void
  /** List of breeds to show (e.g. DOG_BREEDS or CAT_BREEDS). */
  breeds: string[]
  placeholder?: string
  className?: string
}

function displayLabel(value: string): string | null {
  if (value === '') return null
  if (value === MIXED_BREED) return NO_BREED_LABEL
  return value
}

export default function BreedSelect({
  value,
  onChange,
  breeds,
  placeholder = 'Оберіть породу',
  className,
}: BreedSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const options = [NO_BREED_LABEL, ...breeds]
  const filtered =
    query.trim().length === 0
      ? options
      : options.filter((b) => b.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setQuery('')
  }, [open])

  function handleSelect(breed: string) {
    onChange(breed === NO_BREED_LABEL ? MIXED_BREED : breed)
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation()
    onChange('')
  }

  const label = displayLabel(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          className,
        )}
      >
        <span className={label ? 'text-foreground truncate' : 'text-muted-foreground'}>
          {label ?? placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0 ml-1">
          {label && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              aria-label="Очистити вибір"
              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </span>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Пошук породи…"
              className="w-full h-8 pl-8 pr-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
        </div>

        <div className="max-h-[260px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Породу не знайдено</p>
          ) : (
            filtered.map((breed) => {
              const isSelected =
                breed === NO_BREED_LABEL ? value === MIXED_BREED : breed === value
              return (
                <button
                  key={breed}
                  type="button"
                  onClick={() => handleSelect(breed)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition',
                    isSelected && 'bg-accent font-medium',
                  )}
                >
                  <Check
                    className={cn(
                      'w-3.5 h-3.5 shrink-0',
                      isSelected ? 'opacity-100 text-emerald-600' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{breed}</span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
