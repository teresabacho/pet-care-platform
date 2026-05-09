import { Check } from 'lucide-react'
import { CaretakerSkill } from '@pet-care/shared'
import { SKILL_LABELS } from '../../lib/caretaker-labels'
import { cn } from '@/lib/utils'

interface SkillsFormProps {
  value: CaretakerSkill[]
  onChange: (next: CaretakerSkill[]) => void
}

const ALL_SKILLS = Object.values(CaretakerSkill)

export function SkillsForm({ value, onChange }: SkillsFormProps) {
  function toggle(skill: CaretakerSkill) {
    onChange(
      value.includes(skill)
        ? value.filter((s) => s !== skill)
        : [...value, skill],
    )
  }

  return (
    <div className="space-y-2">
      {ALL_SKILLS.map((skill) => {
        const active = value.includes(skill)
        return (
          <button
            type="button"
            key={skill}
            onClick={() => toggle(skill)}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3 py-3 rounded-md border text-sm transition-colors text-left',
              active
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400',
            )}
          >
            <span>{SKILL_LABELS[skill]}</span>
            {active && <Check className="w-4 h-4 shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
