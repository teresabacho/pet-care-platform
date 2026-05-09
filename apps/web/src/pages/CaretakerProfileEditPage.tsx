import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  FolderHeart,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { MediaOwnerType, ServiceType } from '@pet-care/shared'
import { caretakerProfileService } from '../services/caretaker-profile.service'
import { serviceOfferingsService } from '../services/service-offerings.service'
import { certificatesService } from '../services/certificates.service'
import { useAuthStore } from '../store/authStore'
import { Button } from '@/components/ui/button'
import { BaseInfoForm, type BaseInfoFormValue } from '../components/caretaker-form/BaseInfoForm'
import { LocationForm, type LocationFormValue } from '../components/caretaker-form/LocationForm'
import { SkillsForm } from '../components/caretaker-form/SkillsForm'
import {
  ServiceForm,
  buildCreateDto,
  buildUpdateDto,
  emptyServiceFormValue,
  isServiceFormValid,
  serviceFormValueFromOffering,
  type ServiceFormValue,
} from '../components/caretaker-form/ServiceForm'
import { MediaGallery } from '../components/caretaker-form/MediaGallery'
import { ServicesSection } from '../components/caretaker-edit/ServicesSection'
import { CertificatesSection } from '../components/caretaker-edit/CertificatesSection'
import type { CaretakerProfile, Certificate, ServiceOffering } from '../types'
import { cn } from '@/lib/utils'

type SectionId =
  | 'base'
  | 'location'
  | 'skills'
  | 'services'
  | 'certificates'
  | 'gallery'

const SECTIONS: { id: SectionId; label: string; Icon: typeof UserRound }[] = [
  { id: 'base', label: 'Базова інформація', Icon: UserRound },
  { id: 'location', label: 'Локація', Icon: MapPin },
  { id: 'skills', label: 'Навички', Icon: Sparkles },
  { id: 'services', label: 'Послуги', Icon: Layers },
  { id: 'certificates', label: 'Сертифікати', Icon: FolderHeart },
  { id: 'gallery', label: 'Галерея', Icon: ImageIcon },
]

function isSection(v: string | null): v is SectionId {
  return SECTIONS.some((s) => s.id === v)
}

export default function CaretakerProfileEditPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const section: SectionId = isSection(sectionParam) ? sectionParam : 'base'

  const [profile, setProfile] = useState<CaretakerProfile | null | undefined>(
    undefined,
  )
  const [services, setServices] = useState<ServiceOffering[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const p = await caretakerProfileService.getMyCaretakerProfile()
        if (cancelled) return
        if (p && user) {
          const [svc, certs] = await Promise.all([
            serviceOfferingsService.getByCaretaker(user.id).catch(() => []),
            certificatesService
              .getByCaretakerProfile(p.id)
              .catch(() => [] as Certificate[]),
          ])
          if (cancelled) return
          setServices(svc)
          setCertificates(certs)
        }
        setProfile(p)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  function changeSection(next: SectionId) {
    setSearchParams({ section: next })
  }

  if (loading || profile === undefined) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }
  if (profile === null) {
    return <Navigate to="/settings/caretaker-profile/onboarding" replace />
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings/caretaker-profile')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          До дашборду
        </Button>
      </div>

      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">
        Редагування профілю
      </h1>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar / horizontal tabs */}
        <nav
          aria-label="Секції редагування"
          className="md:sticky md:top-6 md:self-start"
        >
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-4 px-4 md:m-0 md:p-0 pb-2 md:pb-0">
            {SECTIONS.map((s) => {
              const active = s.id === section
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => changeSection(s.id)}
                    className={cn(
                      'w-full whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors',
                      active
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400',
                    )}
                  >
                    <s.Icon className="w-4 h-4" />
                    <span>{s.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Content */}
        <main className="min-w-0">
          {section === 'base' && (
            <BaseInfoSection profile={profile} onSaved={setProfile} />
          )}
          {section === 'location' && (
            <LocationSection profile={profile} onSaved={setProfile} />
          )}
          {section === 'skills' && (
            <SkillsSection profile={profile} onSaved={setProfile} />
          )}
          {section === 'services' && (
            <ServicesSection
              services={services}
              onChange={setServices}
            />
          )}
          {section === 'certificates' && (
            <CertificatesSection
              caretakerProfileId={profile.id}
              certificates={certificates}
              onChange={setCertificates}
            />
          )}
          {section === 'gallery' && (
            <SectionFrame title="Галерея робіт">
              <MediaGallery
                ownerType={MediaOwnerType.CARETAKER_GALLERY}
                ownerId={profile.id}
              />
            </SectionFrame>
          )}
        </main>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sub-sections — використовують спільні форм-компоненти

interface SectionFrameProps {
  title: string
  description?: string
  children: React.ReactNode
}

function SectionFrame({ title, description, children }: SectionFrameProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {description && (
          <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
        )}
      </header>
      {children}
    </section>
  )
}

interface ProfileSectionProps {
  profile: CaretakerProfile
  onSaved: (next: CaretakerProfile) => void
}

function BaseInfoSection({ profile, onSaved }: ProfileSectionProps) {
  const [value, setValue] = useState<BaseInfoFormValue>({
    bio: profile.bio ?? '',
    experienceYears: profile.experienceYears,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const bioTooShort = value.bio.length > 0 && value.bio.length < 50
  const dirty =
    value.bio !== (profile.bio ?? '') ||
    value.experienceYears !== profile.experienceYears

  async function handleSave() {
    if (bioTooShort) return
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const next = await caretakerProfileService.updateCaretakerProfile({
        bio: value.bio.trim() || undefined,
        experienceYears:
          value.experienceYears === null ? undefined : value.experienceYears,
      })
      onSaved(next)
      setSaved(true)
    } catch {
      setError('Не вдалося зберегти. Спробуйте ще раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionFrame
      title="Базова інформація"
      description="Опис «Про вас» і досвід — те, що клієнт побачить першим."
    >
      <BaseInfoForm value={value} onChange={setValue} />
      <SaveBar
        busy={busy}
        dirty={dirty}
        error={error}
        saved={saved}
        disabled={bioTooShort}
        onSave={handleSave}
      />
    </SectionFrame>
  )
}

function LocationSection({ profile, onSaved }: ProfileSectionProps) {
  const [value, setValue] = useState<LocationFormValue>({
    serviceLatitude: profile.serviceLatitude,
    serviceLongitude: profile.serviceLongitude,
    radiusKm: profile.radiusKm ?? 5,
    addressIsPublic: profile.addressIsPublic,
    country: profile.country,
    city: profile.city ?? '',
    street: profile.street ?? '',
    apartment: profile.apartment ?? '',
    floor: profile.floor ?? '',
    entrance: profile.entrance ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (value.serviceLatitude === null || value.serviceLongitude === null) {
      setError('Оберіть точку на карті')
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const next = await caretakerProfileService.updateCaretakerProfile({
        serviceLatitude: value.serviceLatitude,
        serviceLongitude: value.serviceLongitude,
        radiusKm: value.radiusKm,
        addressIsPublic: value.addressIsPublic,
        city: value.city || undefined,
        street: value.street || undefined,
        apartment: value.apartment || undefined,
        floor: value.floor || undefined,
        entrance: value.entrance || undefined,
      })
      onSaved(next)
      setSaved(true)
    } catch {
      setError('Не вдалося зберегти. Спробуйте ще раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionFrame
      title="Локація і зона роботи"
      description="Точка на карті — звідки ви працюєте. Радіус — у яких межах берете замовлення."
    >
      <LocationForm value={value} onChange={setValue} />
      <SaveBar
        busy={busy}
        dirty
        error={error}
        saved={saved}
        onSave={handleSave}
      />
    </SectionFrame>
  )
}

function SkillsSection({ profile, onSaved }: ProfileSectionProps) {
  const [value, setValue] = useState(profile.skills)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = useMemo(() => {
    if (value.length !== profile.skills.length) return true
    const sorted1 = [...value].sort()
    const sorted2 = [...profile.skills].sort()
    return sorted1.some((v, i) => v !== sorted2[i])
  }, [value, profile.skills])

  async function handleSave() {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const next = await caretakerProfileService.updateCaretakerProfile({
        skills: value,
      })
      onSaved(next)
      setSaved(true)
    } catch {
      setError('Не вдалося зберегти. Спробуйте ще раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionFrame
      title="Навички"
      description="Опціонально — підвищують довіру і ранжування у пошуку."
    >
      <SkillsForm value={value} onChange={setValue} />
      <SaveBar
        busy={busy}
        dirty={dirty}
        error={error}
        saved={saved}
        onSave={handleSave}
      />
    </SectionFrame>
  )
}

// ----------------------------------------------------------------------------
// Save bar

interface SaveBarProps {
  busy: boolean
  dirty: boolean
  error: string | null
  saved: boolean
  disabled?: boolean
  onSave: () => void
}

function SaveBar({
  busy,
  dirty,
  error,
  saved,
  disabled,
  onSave,
}: SaveBarProps) {
  return (
    <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
      <Button onClick={onSave} disabled={busy || !dirty || disabled}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Зберегти'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !error && (
        <p className="text-sm text-emerald-600">Збережено</p>
      )}
    </div>
  )
}

// Експортуємо переюзовно (для wizard step-ів)
export {
  SectionFrame,
  SaveBar,
  ServiceForm,
  buildCreateDto,
  buildUpdateDto,
  emptyServiceFormValue,
  isServiceFormValid,
  serviceFormValueFromOffering,
  ServiceType,
}
export type { ServiceFormValue }
