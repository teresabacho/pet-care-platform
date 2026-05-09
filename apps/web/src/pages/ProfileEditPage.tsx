import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  CheckCircle2,
  CreditCard,
  Construction,
  ExternalLink,
  Lock,
  Trash2,
  User as UserIcon,
} from 'lucide-react'
import { MediaOwnerType } from '@pet-care/shared'
import { useAuthStore } from '../store/authStore'
import { usersService } from '../services/users.service'
import { mediaService } from '../services/media.service'
import { ImageUploader } from '../components/media'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import AddressPicker, { EMPTY_ADDRESS, type AddressValue } from '../components/profile/AddressPicker'
import {
  EditPageLayout,
  type EditPageSection,
} from '../components/edit-page-layout/EditPageLayout'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { UserPublic } from '../types'

type SectionId = 'personal' | 'payment' | 'security' | 'caretaker'

const SECTIONS: EditPageSection[] = [
  { id: 'personal', label: 'Особисті дані', Icon: UserIcon },
  { id: 'payment', label: 'Способи оплати', Icon: CreditCard },
  { id: 'security', label: 'Безпека', Icon: Lock },
  { id: 'caretaker', label: 'Профіль виконавця', Icon: Briefcase },
]

function isSection(v: string): v is SectionId {
  return SECTIONS.some((s) => s.id === v)
}

function ComingSoonCard({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
        <Construction className="w-8 h-8 text-zinc-400" />
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <p className="text-sm text-zinc-500">Цей розділ буде готовий незабаром.</p>
      </CardContent>
    </Card>
  )
}

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const [profile, setProfile] = useState<UserPublic | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [section, setSection] = useState<SectionId>('personal')

  // Personal data form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [showDeleteAvatar, setShowDeleteAvatar] = useState(false)
  const [userAddress, setUserAddress] = useState<AddressValue>(EMPTY_ADDRESS)
  const [userSaving, setUserSaving] = useState(false)
  const [userMsg, setUserMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void usersService
      .getById(user.id)
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setFirstName(data.firstName ?? '')
        setLastName(data.lastName ?? '')
        setPhone(data.phone ?? '')
        setAvatarUrl(data.avatarUrl ?? '')
        setUserAddress({
          country: data.country ?? null,
          city: data.city ?? null,
          street: data.street ?? null,
          apartment: data.apartment ?? null,
          floor: data.floor ?? null,
          entrance: data.entrance ?? null,
          latitude: null,
          longitude: null,
        })
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  async function saveUserInfo(e: FormEvent) {
    e.preventDefault()
    setUserSaving(true)
    setUserMsg(null)
    try {
      const updated = await usersService.updateMe({
        firstName,
        lastName,
        phone,
        country: userAddress.country ?? undefined,
        city: userAddress.city ?? undefined,
        street: userAddress.street ?? undefined,
        apartment: userAddress.apartment ?? undefined,
        floor: userAddress.floor ?? undefined,
        entrance: userAddress.entrance ?? undefined,
      })
      setUser({ ...updated })
      setUserMsg('Збережено')
    } catch {
      setUserMsg('Помилка збереження')
    } finally {
      setUserSaving(false)
    }
  }

  async function onAvatarUploaded() {
    if (!user) return
    setAvatarBusy(true)
    setAvatarMsg(null)
    try {
      const fresh = await usersService.getById(user.id)
      setProfile(fresh)
      setAvatarUrl(fresh.avatarUrl ?? '')
      setUser({ ...fresh })
      setAvatarMsg('Фото оновлено')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function confirmDeleteAvatar() {
    if (!user) return
    setAvatarBusy(true)
    setAvatarMsg(null)
    try {
      await mediaService.deleteOwnUserAvatar()
      setAvatarUrl('')
      setUser({ ...user, avatarUrl: null })
      setAvatarMsg('Фото видалено')
    } catch {
      setAvatarMsg('Не вдалося видалити фото')
    } finally {
      setAvatarBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Завантаження…
      </div>
    )
  }

  const initials = (
    (firstName[0] ?? '') + (lastName[0] ?? profile?.email[0] ?? '?')
  ).toUpperCase()

  const hasCaretakerProfile = !!profile?.caretakerProfile

  return (
    <EditPageLayout
      title="Налаштування акаунту"
      sections={SECTIONS}
      activeSection={section}
      onSectionChange={(id) => {
        if (isSection(id)) setSection(id)
      }}
      backLabel="До профілю"
      onBack={() => navigate('/profile')}
    >
      {section === 'personal' && (
        <Card>
          <CardHeader>
            <CardTitle>Особисті дані</CardTitle>
            <CardDescription>
              Ці дані бачать інші користувачі та виконавці у твоїх бронюваннях.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveUserInfo} className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border border-border">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="avatar" />}
                    <AvatarFallback className="text-xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Label>Фото профілю</Label>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG або WebP до 5 МБ.
                    </p>
                  </div>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={avatarBusy}
                      onClick={() => setShowDeleteAvatar(true)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Видалити
                    </Button>
                  )}
                </div>
                {user && (
                  <ImageUploader
                    ownerType={MediaOwnerType.USER_AVATAR}
                    ownerId={user.id}
                    maxSizeBytes={5 * 1024 * 1024}
                    label={
                      avatarUrl
                        ? 'Перетягніть нове фото або клацніть, щоб замінити'
                        : 'Перетягніть фото сюди або клацніть'
                    }
                    onUploadComplete={onAvatarUploaded}
                    onError={(m) => setAvatarMsg(m)}
                  />
                )}
                {avatarMsg && (
                  <p className="text-xs text-muted-foreground">{avatarMsg}</p>
                )}
              </div>

              <Separator />

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">Імʼя</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ольга"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Прізвище</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Коваленко"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380 50 123 4567"
                />
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <Label>Адреса проживання</Label>
                <AddressPicker
                  value={userAddress}
                  onChange={setUserAddress}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={userSaving}>
                  {userSaving ? 'Зберігаю…' : 'Зберегти'}
                </Button>
                {userMsg && (
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {userMsg}
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {section === 'payment' && <ComingSoonCard title="Способи оплати" />}
      {section === 'security' && <ComingSoonCard title="Налаштування безпеки" />}

      {section === 'caretaker' && (
        <Card>
          <CardHeader>
            <CardTitle>Профіль виконавця</CardTitle>
            <CardDescription>
              Дані, які бачать власники тваринок при пошуку: bio, локація,
              послуги, тарифи, навички, сертифікати, галерея.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCaretakerProfile ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Профіль виконавця вже створено. Перейдіть до окремої сторінки
                  редагування — там зручніший інтерфейс із табами для всіх
                  розділів.
                </p>
                <Button
                  onClick={() =>
                    navigate('/settings/caretaker-profile/edit')
                  }
                  className="self-start"
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Відкрити редагування профілю виконавця
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Заповніть профіль, щоб пропонувати свої послуги клієнтам.
                  Реєстрація проходить через короткий wizard з 5 кроків.
                </p>
                <Button
                  onClick={() =>
                    navigate('/settings/caretaker-profile/onboarding')
                  }
                  className="self-start"
                >
                  Стати виконавцем
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={showDeleteAvatar}
        onOpenChange={setShowDeleteAvatar}
        title="Видалити фото профілю?"
        description="Файл буде видалений безповоротно."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={confirmDeleteAvatar}
      />
    </EditPageLayout>
  )
}
