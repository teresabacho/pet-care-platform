import { useState } from 'react'
import { MediaOwnerType } from '@pet-care/shared'
import { useCaretakerOnboardingStore } from '../../store/caretakerOnboardingStore'
import { useAuthStore } from '../../store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUploader } from '../media/ImageUploader'

export default function Step1Personal() {
  const { formData, setField, nextStep } = useCaretakerOnboardingStore()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { firstName, lastName, phone, avatarUrl } = formData
  const [uploadError, setUploadError] = useState<string | null>(null)

  const isValid =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    phone.trim().length >= 7 &&
    avatarUrl !== ''

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900">Особисті дані</h2>
        <p className="text-sm text-zinc-600">
          Це базова інформація вашого акаунту. Імʼя, фото і телефон бачитимуть клієнти, які з вами звʼяжуться.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Фото профілю</Label>
        {avatarUrl ? (
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border border-zinc-200"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setField('avatarUrl', '')}
            >
              Замінити
            </Button>
          </div>
        ) : user ? (
          <ImageUploader
            ownerType={MediaOwnerType.USER_AVATAR}
            ownerId={user.id}
            onUploadComplete={(item) => {
              setField('avatarUrl', item.url)
              // Оновлюємо авторайзед-стор, щоб Header підхопив новий аватар
              setUser({ ...user, avatarUrl: item.url })
              setUploadError(null)
            }}
            onError={(msg) => setUploadError(msg)}
            label="Перетягніть фото сюди або клацніть, щоб обрати"
          />
        ) : (
          <p className="text-sm text-zinc-500">Завантаження…</p>
        )}
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Імʼя</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            placeholder="Олена"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Прізвище</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setField('lastName', e.target.value)}
            placeholder="Коваленко"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Телефон</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setField('phone', e.target.value)}
          placeholder="+380 50 123 4567"
        />
      </div>

      <div className="flex justify-end pt-2">
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
