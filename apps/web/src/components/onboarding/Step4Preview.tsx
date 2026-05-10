import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Pencil } from 'lucide-react'
import {
  AdditionalServiceCapability,
  CatSize,
  DogSize,
  HomeCondition,
  MediaOwnerType,
  PetAgeGroup,
  ServiceType,
} from '@pet-care/shared'
import {
  useCaretakerOnboardingStore,
  type ServiceFormData,
} from '../../store/caretakerOnboardingStore'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/auth.service'
import { caretakerProfileService } from '../../services/caretaker-profile.service'
import { usersService } from '../../services/users.service'
import { mediaService } from '../../services/media.service'
import {
  serviceOfferingsService,
  type CreateServiceOfferingDto,
} from '../../services/service-offerings.service'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SERVICE_TYPE_LABELS } from '../../lib/caretaker-labels'

// Будує policy із даних форми (із fallback на «приймаю все», якщо нічого не вказано —
// щоб профіль одразу був видимим у пошуку без додаткових клацань).
function buildPolicy(
  serviceType: ServiceType,
  data: ServiceFormData,
): Partial<CreateServiceOfferingDto> {
  const dogSizes =
    data.acceptedDogSizes.length > 0 ? data.acceptedDogSizes : Object.values(DogSize)
  const catSizes =
    data.acceptedCatSizes.length > 0 ? data.acceptedCatSizes : Object.values(CatSize)
  const ageGroups =
    data.acceptedAgeGroups.length > 0 ? data.acceptedAgeGroups : Object.values(PetAgeGroup)

  const baseFields = {
    acceptedDogSizes: dogSizes,
    acceptedAgeGroups: ageGroups,
    acceptsSpecialNeedsPets: data.acceptsSpecialNeedsPets,
    capabilities: [] as AdditionalServiceCapability[],
  }
  if (serviceType === ServiceType.WALKING) {
    return {
      walkingPolicy: {
        ...baseFields,
        acceptedCatSizes: catSizes,
        // На бекенді поле досі maxDogsAtOnce — мапимо з maxPetsAtOnce.
        maxDogsAtOnce: data.maxPetsAtOnce,
      },
    }
  }
  if (serviceType === ServiceType.PET_SITTING) {
    return { petSittingPolicy: { ...baseFields, acceptedCatSizes: catSizes } }
  }
  if (serviceType === ServiceType.BOARDING) {
    return {
      boardingPolicy: {
        ...baseFields,
        acceptedCatSizes: catSizes,
        homeConditions: data.homeConditions as HomeCondition[],
      },
    }
  }
  return {}
}

function buildOfferingDto(serviceType: ServiceType, data: ServiceFormData): CreateServiceOfferingDto {
  const validTiers = data.tiers.filter((t) => t.basePrice !== null && t.basePrice > 0)
  return {
    serviceType,
    description: data.description.trim() || undefined,
    tiers: validTiers.map((t) => ({
      durationMinutes: t.durationMinutes,
      basePrice: t.basePrice as number,
      priceUnit: t.priceUnit,
    })),
    sizeSurcharges: data.sizeSurcharges.length > 0 ? data.sizeSurcharges : undefined,
    addons:
      data.addons.length > 0
        ? data.addons.map((a) => ({
            name: a.name,
            description: a.description || undefined,
            price: a.price,
            priceUnit: a.priceUnit,
          }))
        : undefined,
    inclusions:
      data.inclusions.length > 0
        ? data.inclusions.map((text) => ({ text }))
        : undefined,
    ...buildPolicy(serviceType, data),
  }
}

export default function Step5Preview() {
  const navigate = useNavigate()
  const { formData, prevStep, reset, goToStep, setEditingServiceType } =
    useCaretakerOnboardingStore()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initials = formData.firstName
    ? formData.firstName[0].toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? '?')

  // Перевіряємо валідність на кроках та збираємо «помилки» для UX-jump.
  type StepError = {
    label: string
    fixStep: 1 | 2 | 3 | 4 | 5
    serviceType?: ServiceType
  }
  const errors: StepError[] = []

  if (
    !formData.firstName.trim() ||
    !formData.lastName.trim() ||
    !formData.phone.trim() ||
    !formData.avatarUrl ||
    !formData.userCountry
  ) {
    errors.push({ label: 'Не заповнено особисті дані', fixStep: 1 })
  }
  if (formData.bio.trim().length < 50 || formData.experienceYears === null) {
    errors.push({ label: 'Не заповнено секцію «Про вас»', fixStep: 2 })
  }
  if (formData.serviceLatitude === null || formData.serviceLongitude === null || !formData.country) {
    errors.push({ label: 'Не вказано локацію', fixStep: 3 })
  }
  if (formData.selectedServiceTypes.length === 0) {
    errors.push({ label: 'Не обрано жодну послугу', fixStep: 4 })
  } else {
    formData.selectedServiceTypes.forEach((t) => {
      const sd = formData.servicesData[t]
      if (!sd) return
      const validTiers = sd.tiers.filter((tt) => tt.basePrice !== null && tt.basePrice > 0)
      if (validTiers.length === 0) {
        errors.push({
          label: `${SERVICE_TYPE_LABELS[t]}: не вказано тариф`,
          fixStep: 4,
          serviceType: t,
        })
      }
    })
  }

  const handleSubmit = async () => {
    if (errors.length > 0) {
      setError('Спочатку виправте помилки в розділах нижче')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // 1. User-поля (включно з адресою проживання — Step 1)
      await usersService.updateMe({
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        country: formData.userCountry || undefined,
        city: formData.userCity.trim() || undefined,
        street: formData.userStreet.trim() || undefined,
        apartment: formData.userApartment.trim() || undefined,
        floor: formData.userFloor.trim() || undefined,
        entrance: formData.userEntrance.trim() || undefined,
      })

      // 2. CaretakerProfile
      const createdProfile = await caretakerProfileService.createCaretakerProfile({
        bio: formData.bio.trim(),
        experienceYears: formData.experienceYears ?? undefined,
        skills: formData.skills,
        languages: formData.languages,
        addressIsPublic: formData.addressIsPublic,
        serviceLatitude: formData.serviceLatitude ?? undefined,
        serviceLongitude: formData.serviceLongitude ?? undefined,
        radiusKm: formData.radiusKm,
        serviceTypes: formData.selectedServiceTypes,
        country: formData.country.trim() || undefined,
        city: formData.city.trim() || undefined,
        street: formData.street.trim() || undefined,
        apartment: formData.apartment.trim() || undefined,
        floor: formData.floor.trim() || undefined,
        entrance: formData.entrance.trim() || undefined,
      })

      // 3. По одному ServiceOffering на кожен обраний тип
      for (const t of formData.selectedServiceTypes) {
        const sd = formData.servicesData[t]
        if (!sd) continue
        const dto = buildOfferingDto(t, sd)
        await serviceOfferingsService.create(dto)
      }

      // 4. Залити галерею (CARETAKER_GALLERY) — потрібен createdProfile.id як ownerId.
      // Помилки тут не блокуючі — якщо не вийшло, юзер може дозалити з дашборду.
      for (const file of formData.galleryFiles) {
        try {
          await mediaService.uploadImage(
            file,
            MediaOwnerType.CARETAKER_GALLERY,
            createdProfile.id,
          )
        } catch {
          // ignore — галерею можна додати з дашборду пізніше
        }
      }

      // 5. Освіжити user в authStore — після PATCH /users/me бекенд має нові
      // firstName/lastName/phone, але authStore.user досі стара. Без цього
      // дашборд показує «Особисті дані» як неповні.
      const freshUser = await authService.getMe()
      setUser(freshUser)

      reset()
      navigate('/settings/caretaker-profile')
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? null
      const flat = Array.isArray(message) ? message.join(', ') : message
      setError(flat ?? 'Не вдалося створити профіль. Спробуйте ще раз.')
    } finally {
      setSubmitting(false)
    }
  }

  const jumpToFix = (step: 1 | 2 | 3 | 4 | 5, serviceType?: ServiceType) => {
    if (serviceType) {
      setEditingServiceType(serviceType)
    }
    goToStep(step)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900">Перевірте свій профіль</h2>
        <p className="text-sm text-zinc-600">
          Так він буде виглядати клієнтам. Якщо щось хочете виправити — натисніть «Виправити» поряд з потрібним розділом.
        </p>
      </div>

      {/* Картка профілю */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-14 h-14">
            {formData.avatarUrl && <AvatarImage src={formData.avatarUrl} alt="Avatar" />}
            <AvatarFallback className="bg-zinc-900 text-white text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-zinc-900">
              {formData.firstName} {formData.lastName}
            </h3>
            <p className="text-sm text-zinc-600">{user?.email}</p>
            {formData.phone && <p className="text-sm text-zinc-600">{formData.phone}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => goToStep(1)}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Виправити
          </Button>
        </div>

        {formData.bio && (
          <div className="border-t border-zinc-200 pt-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-zinc-700 leading-relaxed flex-1">{formData.bio}</p>
              <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Виправити
              </Button>
            </div>
          </div>
        )}

        <div className="border-t border-zinc-200 pt-3 flex items-start justify-between">
          <p className="text-sm">
            <span className="text-zinc-500">Радіус роботи: </span>
            <span className="font-medium text-zinc-900">{formData.radiusKm} км</span>
          </p>
          <Button variant="ghost" size="sm" onClick={() => goToStep(3)}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Виправити
          </Button>
        </div>
      </div>

      {/* Послуги */}
      {formData.selectedServiceTypes.map((t) => {
        const sd = formData.servicesData[t]
        if (!sd) return null
        return (
          <div key={t} className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-zinc-900">{SERVICE_TYPE_LABELS[t]}</h3>
              <Button variant="ghost" size="sm" onClick={() => jumpToFix(4, t)}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Виправити
              </Button>
            </div>
            {sd.tiers.length > 0 && (
              <ul className="ml-4 list-disc text-sm text-zinc-700">
                {sd.tiers
                  .filter((tt) => tt.basePrice !== null)
                  .map((tt, i) => (
                    <li key={i}>
                      {tt.durationMinutes !== null
                        ? `${tt.durationMinutes} хв — ${tt.basePrice} грн`
                        : `${tt.basePrice} грн (за добу)`}
                    </li>
                  ))}
              </ul>
            )}
            {sd.addons.length > 0 && (
              <p className="text-xs text-zinc-500">
                Додатково: {sd.addons.map((a) => a.name).filter(Boolean).join(', ')}
              </p>
            )}
            {sd.inclusions.length > 0 && (
              <p className="text-xs text-zinc-500">
                Входить у вартість: {sd.inclusions.join(', ')}
              </p>
            )}
          </div>
        )
      })}

      {/* Помилки */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-900">Перед збереженням виправте:</p>
          <ul className="space-y-1.5">
            {errors.map((e, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-amber-900">• {e.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => jumpToFix(e.fixStep, e.serviceType)}
                >
                  Виправити
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={prevStep} disabled={submitting}>
          Назад
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || errors.length > 0}
          className="bg-zinc-900 hover:bg-zinc-800"
        >
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitting ? 'Створюємо профіль…' : 'Завершити та опублікувати'}
        </Button>
      </div>
    </div>
  )
}
