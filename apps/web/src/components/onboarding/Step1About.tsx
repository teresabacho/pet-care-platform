import { useCaretakerOnboardingStore } from '../../store/caretakerOnboardingStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { BaseInfoForm } from '../caretaker-form/BaseInfoForm'
import { SkillsForm } from '../caretaker-form/SkillsForm'
import { StagedGalleryUploader } from './StagedGalleryUploader'

const MIN_BIO_LENGTH = 50

export default function Step1About() {
  const { formData, setField, nextStep, prevStep } =
    useCaretakerOnboardingStore()
  const { bio, experienceYears, skills, galleryFiles } = formData

  const isValid =
    bio.trim().length >= MIN_BIO_LENGTH && experienceYears !== null

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Розкажіть про себе
        </h2>
        <p className="text-sm text-zinc-600">
          Це побачать клієнти на вашій картці. Чесний і теплий опис допомагає
          швидше отримати замовлення.
        </p>
      </div>

      <BaseInfoForm
        value={{ bio, experienceYears }}
        onChange={(v) => {
          setField('bio', v.bio)
          setField('experienceYears', v.experienceYears)
        }}
        bioMinLength={MIN_BIO_LENGTH}
      />

      <div className="space-y-2">
        <Label>Навички (опціонально)</Label>
        <p className="text-xs text-zinc-500">
          Якщо у вас є особливі навички — оберіть. Можна пропустити.
        </p>
        <SkillsForm
          value={skills}
          onChange={(next) => setField('skills', next)}
        />
      </div>

      <div className="space-y-2">
        <Label>Фотогалерея (опціонально)</Label>
        <p className="text-xs text-zinc-500">
          Фото з тваринками, місцем де ви приймаєте, прогулянок. Це важливий
          сигнал довіри для клієнтів — профілі з фото отримують у 3 рази більше
          замовлень.
        </p>
        <StagedGalleryUploader
          files={galleryFiles}
          onChange={(next) => setField('galleryFiles', next)}
        />
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={prevStep}>
          Назад
        </Button>
        <Button
          onClick={nextStep}
          disabled={!isValid}
          className="bg-zinc-900 hover:bg-zinc-800"
        >
          Далі
        </Button>
      </div>
    </div>
  )
}
