import { Language } from '@pet-care/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LanguagesForm } from './LanguagesForm'

export interface BaseInfoFormValue {
  bio: string
  experienceYears: number | null
  languages: Language[]
}

interface BaseInfoFormProps {
  value: BaseInfoFormValue
  onChange: (next: BaseInfoFormValue) => void
  bioMinLength?: number
}

const DEFAULT_MIN_BIO = 50

export function BaseInfoForm({
  value,
  onChange,
  bioMinLength = DEFAULT_MIN_BIO,
}: BaseInfoFormProps) {
  const bioTooShort =
    value.bio.length > 0 && value.bio.length < bioMinLength
  const bioCounterCls = bioTooShort ? 'text-destructive' : 'text-zinc-500'

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="bf-bio">Про вас</Label>
        <Textarea
          id="bf-bio"
          value={value.bio}
          onChange={(e) => onChange({ ...value, bio: e.target.value })}
          rows={6}
          placeholder="Опишіть свій досвід догляду за тваринами, чим ви особливі…"
        />
        <p className={`text-xs ${bioCounterCls}`}>
          {value.bio.length}/{bioMinLength}{' '}
          {bioTooShort
            ? '— мінімум 50 символів або залиште порожнім'
            : 'мін.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bf-exp">Досвід (років)</Label>
        <Input
          id="bf-exp"
          type="number"
          min={0}
          max={70}
          value={value.experienceYears ?? ''}
          onChange={(e) => {
            const v = e.target.value
            onChange({
              ...value,
              experienceYears: v === '' ? null : Number(v),
            })
          }}
          placeholder="0"
          className="w-32"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Мови спілкування</Label>
        <p className="text-xs text-zinc-500">
          Оберіть усі, якими вільно говорите з клієнтами.
        </p>
        <LanguagesForm
          value={value.languages}
          onChange={(next) => onChange({ ...value, languages: next })}
        />
      </div>
    </div>
  )
}
