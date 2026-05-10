import { Check } from 'lucide-react'
import { Language, LANGUAGE_LABELS } from '@pet-care/shared'
import { cn } from '@/lib/utils'

interface LanguagesFormProps {
  value: Language[]
  onChange: (next: Language[]) => void
}

const ALL_LANGUAGES = Object.values(Language)

export function LanguagesForm({ value, onChange }: LanguagesFormProps) {
  function toggle(lang: Language) {
    onChange(
      value.includes(lang)
        ? value.filter((l) => l !== lang)
        : [...value, lang],
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_LANGUAGES.map((lang) => {
        const active = value.includes(lang)
        return (
          <button
            key={lang}
            type="button"
            onClick={() => toggle(lang)}
            className={cn(
              'px-3 py-1.5 rounded-full border text-sm transition-colors flex items-center gap-1.5',
              active
                ? 'bg-zinc-900 border-zinc-900 text-white'
                : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-500',
            )}
          >
            {active && <Check className="w-3.5 h-3.5" />}
            {LANGUAGE_LABELS[lang]}
          </button>
        )
      })}
    </div>
  )
}
