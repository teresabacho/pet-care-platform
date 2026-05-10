import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarCheck,
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
import { AvailabilitySection } from '../components/caretaker-edit/AvailabilitySection'
import {
  EditPageLayout,
  type EditPageSection,
} from '../components/edit-page-layout/EditPageLayout'
import type { CaretakerProfile, Certificate, ServiceOffering } from '../types'

type SectionId =
  | 'base'
  | 'location'
  | 'skills'
  | 'services'
  | 'availability'
  | 'certificates'
  | 'gallery'

const SECTIONS: EditPageSection[] = [
  { id: 'base', label: 'Базова інформація', Icon: UserRound },
  { id: 'location', label: 'Локація', Icon: MapPin },
  { id: 'skills', label: 'Навички', Icon: Sparkles },
  { id: 'services', label: 'Послуги', Icon: Layers },
  { id: 'availability', label: 'Доступність', Icon: CalendarCheck },
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
    <EditPageLayout
      title="Редагування профілю виконавця"
      sections={SECTIONS}
      activeSection={section}
      onSectionChange={(id) => changeSection(id as SectionId)}
      backLabel="До дашборду"
      onBack={() => navigate('/settings/caretaker-profile')}
    >
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
        <ServicesSection services={services} onChange={setServices} />
      )}
      {section === 'availability' && (
        <AvailabilitySection profile={profile} onSaved={setProfile} />
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
    </EditPageLayout>
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
    languages: profile.languages,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const bioTooShort = value.bio.length > 0 && value.bio.length < 50
  const languagesChanged =
    value.languages.length !== profile.languages.length ||
    [...value.languages].sort().some((l, i) => l !== [...profile.languages].sort()[i])
  const dirty =
    value.bio !== (profile.bio ?? '') ||
    value.experienceYears !== profile.experienceYears ||
    languagesChanged

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
        languages: value.languages,
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
