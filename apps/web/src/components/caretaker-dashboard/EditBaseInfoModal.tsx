import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { caretakerProfileService } from '../../services/caretaker-profile.service'
import type { CaretakerProfile } from '../../types'

interface EditBaseInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: CaretakerProfile
  onSaved: (next: CaretakerProfile) => void
}

const MIN_BIO_LENGTH = 50

export default function EditBaseInfoModal({
  open,
  onOpenChange,
  profile,
  onSaved,
}: EditBaseInfoModalProps) {
  const [bio, setBio] = useState(profile.bio ?? '')
  const [experienceYears, setExperienceYears] = useState<number | ''>(
    profile.experienceYears ?? '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // При повторному відкритті — синхронізуємо з актуальним профілем.
  useEffect(() => {
    if (open) {
      setBio(profile.bio ?? '')
      setExperienceYears(profile.experienceYears ?? '')
      setError(null)
    }
  }, [open, profile])

  const bioTooShort = bio.length > 0 && bio.length < MIN_BIO_LENGTH

  async function handleSave() {
    if (bioTooShort) return
    setBusy(true)
    setError(null)
    try {
      const next = await caretakerProfileService.updateCaretakerProfile({
        bio: bio.trim() || undefined,
        experienceYears:
          experienceYears === '' ? undefined : Number(experienceYears),
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
          <SheetTitle>Базова інформація</SheetTitle>
          <SheetDescription>
            Розкажіть про себе і свій досвід — це підвищує довіру клієнтів.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-bio">Про вас</Label>
            <Textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={6}
              placeholder="Опишіть свій досвід догляду за тваринами, чим ви особливі…"
            />
            <p
              className={
                bioTooShort
                  ? 'text-xs text-destructive'
                  : 'text-xs text-zinc-500'
              }
            >
              {bio.length}/{MIN_BIO_LENGTH}{' '}
              {bioTooShort
                ? '— мінімум 50 символів або залиште порожнім'
                : 'мін.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-experience">Досвід (років)</Label>
            <Input
              id="edit-experience"
              type="number"
              min={0}
              max={70}
              value={experienceYears}
              onChange={(e) => {
                const v = e.target.value
                setExperienceYears(v === '' ? '' : Number(v))
              }}
              placeholder="0"
              className="w-32"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={busy || bioTooShort}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Зберегти'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
