import { useEffect, useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { CaretakerSkill } from '@pet-care/shared'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { caretakerProfileService } from '../../services/caretaker-profile.service'
import { SKILL_LABELS } from '../../lib/caretaker-labels'
import type { CaretakerProfile } from '../../types'
import { cn } from '@/lib/utils'

interface EditSkillsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: CaretakerProfile
  onSaved: (next: CaretakerProfile) => void
}

const ALL_SKILLS = Object.values(CaretakerSkill)

export default function EditSkillsModal({
  open,
  onOpenChange,
  profile,
  onSaved,
}: EditSkillsModalProps) {
  const [selected, setSelected] = useState<CaretakerSkill[]>(profile.skills)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSelected(profile.skills)
      setError(null)
    }
  }, [open, profile])

  function toggle(skill: CaretakerSkill) {
    setSelected((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      const next = await caretakerProfileService.updateCaretakerProfile({
        skills: selected,
      })
      onSaved(next)
      onOpenChange(false)
    } catch {
      setError('Не вдалося зберегти. Спробуйте ще раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Навички</SheetTitle>
          <SheetDescription>
            Оберіть усе, що ви вмієте — це підвищує довіру і ранжування у пошуку.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {ALL_SKILLS.map((skill) => {
            const active = selected.includes(skill)
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

          {error && <p className="text-sm text-destructive pt-2">{error}</p>}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Зберегти'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
