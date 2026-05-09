import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2, ExternalLink } from 'lucide-react'
import { caretakerProfileService } from '../services/caretaker-profile.service'
import { serviceOfferingsService } from '../services/service-offerings.service'
import { certificatesService } from '../services/certificates.service'
import { useAuthStore } from '../store/authStore'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import StatusBanner from '../components/caretaker-dashboard/StatusBanner'
import SectionCard, {
  type SectionStatus,
} from '../components/caretaker-dashboard/SectionCard'
import EditBaseInfoModal from '../components/caretaker-dashboard/EditBaseInfoModal'
import EditLocationModal from '../components/caretaker-dashboard/EditLocationModal'
import EditSkillsModal from '../components/caretaker-dashboard/EditSkillsModal'
import EditServiceModal from '../components/caretaker-dashboard/EditServiceModal'
import EditCertificatesModal from '../components/caretaker-dashboard/EditCertificatesModal'
import ServiceListItem from '../components/caretaker-dashboard/ServiceListItem'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SKILL_LABELS } from '../lib/caretaker-labels'
import { CERTIFICATE_TYPE_LABELS } from '../lib/certificate-labels'
import type { CaretakerProfile, Certificate, ServiceOffering } from '../types'
import { ServiceType } from '@pet-care/shared'

type EditingSection = 'base' | 'location' | 'skills' | 'certificates' | null
import { cn } from '@/lib/utils'

function baseInfoStatus(profile: CaretakerProfile): SectionStatus {
  const hasBio = Boolean(profile.bio && profile.bio.length >= 50)
  const hasExp =
    profile.experienceYears !== null && profile.experienceYears !== undefined
  if (hasBio && hasExp) return 'complete'
  if (hasBio || hasExp) return 'partial'
  return 'empty'
}

function locationStatus(profile: CaretakerProfile): SectionStatus {
  const hasCoords =
    profile.serviceLatitude !== null && profile.serviceLongitude !== null
  const hasRadius = profile.radiusKm !== null && profile.radiusKm > 0
  if (hasCoords && hasRadius) return 'complete'
  if (hasCoords || hasRadius) return 'partial'
  return 'empty'
}

function skillsStatus(profile: CaretakerProfile): SectionStatus {
  return profile.skills.length > 0 ? 'complete' : 'empty'
}

function servicesStatus(services: ServiceOffering[]): SectionStatus {
  return services.length > 0 ? 'complete' : 'empty'
}

function certificatesStatus(certificates: Certificate[]): SectionStatus {
  return certificates.length > 0 ? 'complete' : 'empty'
}

export default function CaretakerProfileDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [profile, setProfile] = useState<CaretakerProfile | null | undefined>(
    undefined,
  )
  const [services, setServices] = useState<ServiceOffering[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingSection>(null)
  const [creatingService, setCreatingService] = useState(false)
  const [editingService, setEditingService] = useState<ServiceOffering | null>(
    null,
  )
  const [deletingService, setDeletingService] = useState<ServiceOffering | null>(
    null,
  )
  const [serviceError, setServiceError] = useState<string | null>(null)

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

  async function handleConfirmDelete() {
    if (!deletingService) return
    try {
      await serviceOfferingsService.delete(deletingService.id)
      setServices((prev) => prev.filter((s) => s.id !== deletingService.id))
      setServiceError(null)
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status
      if (status === 409) {
        setServiceError(
          'Не можна видалити: на послугу є активні або завершені замовлення',
        )
      } else {
        setServiceError('Не вдалося видалити послугу. Спробуйте ще раз.')
      }
    } finally {
      setDeletingService(null)
    }
  }

  const sections = [
    {
      key: 'base',
      status: baseInfoStatus(profile),
    },
    {
      key: 'location',
      status: locationStatus(profile),
    },
    {
      key: 'skills',
      status: skillsStatus(profile),
    },
    {
      key: 'services',
      status: servicesStatus(services),
    },
    {
      key: 'certificates',
      status: certificatesStatus(certificates),
    },
  ]

  const completedCount = sections.filter((s) => s.status === 'complete').length
  const partialCount = sections.filter((s) => s.status === 'partial').length
  const percent = Math.round(
    ((completedCount + partialCount * 0.5) / sections.length) * 100,
  )

  const initials = user?.firstName
    ? user.firstName[0].toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? '?')

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <StatusBanner services={services} />

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="w-16 h-16">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="Avatar" />}
            <AvatarFallback className="bg-zinc-900 text-white text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-zinc-900">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-sm text-zinc-600">{user?.email}</p>
            {user?.phone && <p className="text-sm text-zinc-600">{user.phone}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/profile/edit')}>
            Редагувати
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-900">Заповненість профілю</span>
            <span className="text-zinc-500">{percent}%</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                percent >= 80
                  ? 'bg-emerald-500'
                  : percent >= 50
                    ? 'bg-amber-500'
                    : 'bg-zinc-400',
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionCard
          title="Базова інформація"
          description="Опис «Про вас» і досвід роботи"
          status={baseInfoStatus(profile)}
          actionLabel={
            baseInfoStatus(profile) === 'empty' ? 'Заповнити' : 'Редагувати'
          }
          onAction={() => setEditing('base')}
        >
          {profile.bio && (
            <p className="text-sm text-zinc-700 line-clamp-2">{profile.bio}</p>
          )}
          {profile.experienceYears !== null &&
            profile.experienceYears !== undefined && (
              <p className="text-xs text-zinc-500 mt-1">
                Досвід: {profile.experienceYears} р.
              </p>
            )}
        </SectionCard>

        <SectionCard
          title="Локація і зона роботи"
          description="Точка на карті та радіус, у якому ви працюєте"
          status={locationStatus(profile)}
          actionLabel={
            locationStatus(profile) === 'empty' ? 'Налаштувати' : 'Редагувати'
          }
          onAction={() => setEditing('location')}
        >
          {profile.city && (
            <p className="text-sm text-zinc-700">
              {[profile.city, profile.street].filter(Boolean).join(', ')}
            </p>
          )}
          {profile.radiusKm && (
            <p className="text-xs text-zinc-500 mt-1">
              Радіус: {profile.radiusKm} км
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Навички"
          description="Опціонально — підвищують довіру і ранжування"
          status={skillsStatus(profile)}
          actionLabel={
            skillsStatus(profile) === 'empty' ? 'Додати' : 'Редагувати'
          }
          onAction={() => setEditing('skills')}
        >
          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {SKILL_LABELS[s]}
                </Badge>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Послуги"
          description="Тарифи, прийняті види тваринок, правила"
          status={servicesStatus(services)}
          actionLabel={
            services.length < Object.values(ServiceType).length
              ? 'Додати'
              : undefined
          }
          onAction={
            services.length < Object.values(ServiceType).length
              ? () => setCreatingService(true)
              : undefined
          }
        >
          {serviceError && (
            <p className="text-sm text-destructive mb-2">{serviceError}</p>
          )}
          {services.length > 0 && (
            <div className="space-y-2">
              {services.map((s) => (
                <ServiceListItem
                  key={s.id}
                  service={s}
                  onEdit={(svc) => {
                    setServiceError(null)
                    setEditingService(svc)
                  }}
                  onDelete={(svc) => {
                    setServiceError(null)
                    setDeletingService(svc)
                  }}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Сертифікати"
          description="Документи, що підтверджують кваліфікацію"
          status={certificatesStatus(certificates)}
          actionLabel={certificates.length === 0 ? 'Додати' : 'Редагувати'}
          onAction={() => setEditing('certificates')}
        >
          {certificates.length > 0 && (
            <ul className="space-y-1">
              {certificates.map((c) => (
                <li
                  key={c.id}
                  className="text-sm text-zinc-700 flex items-center gap-2"
                >
                  <span className="font-medium truncate">{c.title}</span>
                  <span className="text-xs text-zinc-500 shrink-0">
                    · {CERTIFICATE_TYPE_LABELS[c.type]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Галерея робіт"
          description="Фото з ваших попередніх замовлень"
          status="empty"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {user && (
          <Button
            variant="outline"
            onClick={() => window.open(`/caretaker/${user.id}`, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Подивитися як клієнт
          </Button>
        )}
      </div>

      <EditBaseInfoModal
        open={editing === 'base'}
        onOpenChange={(o) => setEditing(o ? 'base' : null)}
        profile={profile}
        onSaved={setProfile}
      />
      <EditLocationModal
        open={editing === 'location'}
        onOpenChange={(o) => setEditing(o ? 'location' : null)}
        profile={profile}
        onSaved={setProfile}
      />
      <EditSkillsModal
        open={editing === 'skills'}
        onOpenChange={(o) => setEditing(o ? 'skills' : null)}
        profile={profile}
        onSaved={setProfile}
      />
      <EditCertificatesModal
        open={editing === 'certificates'}
        onOpenChange={(o) => setEditing(o ? 'certificates' : null)}
        caretakerProfileId={profile.id}
        certificates={certificates}
        onChange={setCertificates}
      />
      <EditServiceModal
        open={creatingService}
        onOpenChange={setCreatingService}
        mode="create"
        existingServiceTypes={services.map((s) => s.serviceType)}
        onSaved={(created) => setServices((prev) => [...prev, created])}
      />
      {editingService && (
        <EditServiceModal
          open={editingService !== null}
          onOpenChange={(o) => {
            if (!o) setEditingService(null)
          }}
          mode="edit"
          service={editingService}
          onSaved={(updated) => {
            setServices((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            )
            setEditingService(null)
          }}
        />
      )}
      <ConfirmDialog
        open={deletingService !== null}
        onOpenChange={(o) => {
          if (!o) setDeletingService(null)
        }}
        title="Видалити послугу?"
        description="Це назавжди видалить послугу разом з усіма тарифами, надбавками за розмір та додатковими послугами. Активні замовлення цієї послуги не постраждають."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
