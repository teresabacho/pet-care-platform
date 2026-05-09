import {
  EMPTY_SERVICE_FORM_DATA,
  type OnboardingFormData,
  type OnboardingStepNumber,
  type ServiceFormData,
} from '../../store/caretakerOnboardingStore'
import { cn } from '@/lib/utils'

interface StepFieldStatus {
  required: number
  filled: number
  optional: number
  optionalFilled: number
}

function isServiceTiersValid(sd: ServiceFormData): boolean {
  return (
    sd.tiers.length > 0 &&
    sd.tiers.every(
      (t) =>
        t.basePrice !== null &&
        t.basePrice > 0 &&
        (t.priceUnit === 'PER_DAY' || (t.durationMinutes !== null && t.durationMinutes > 0)),
    )
  )
}

function computeStepStatus(
  data: OnboardingFormData,
  step: OnboardingStepNumber,
): StepFieldStatus {
  if (step === 1) {
    const required = ['firstName', 'lastName', 'phone', 'avatarUrl'] as const
    const filled = required.filter((k) => data[k].toString().trim().length > 0).length
    return { required: required.length, filled, optional: 0, optionalFilled: 0 }
  }
  if (step === 2) {
    // Адреса проживання (userCountry) + service-локація (country + lat/lng)
    const requiredFilled =
      (data.userCountry.length > 0 ? 1 : 0) +
      (data.country.length > 0 ? 1 : 0) +
      (data.serviceLatitude !== null && data.serviceLongitude !== null ? 1 : 0)
    const optionalFields = [
      'userCity',
      'userStreet',
      'userApartment',
      'userFloor',
      'userEntrance',
      'city',
      'street',
      'apartment',
      'floor',
      'entrance',
    ] as const
    const optionalFilled = optionalFields.filter((k) => data[k].trim().length > 0).length
    return {
      required: 3,
      filled: requiredFilled,
      optional: optionalFields.length,
      optionalFilled,
    }
  }
  if (step === 3) {
    const requiredFilled =
      (data.bio.trim().length >= 50 ? 1 : 0) + (data.experienceYears !== null ? 1 : 0)
    return {
      required: 2,
      filled: requiredFilled,
      optional: 1,
      optionalFilled: data.skills.length > 0 ? 1 : 0,
    }
  }
  if (step === 4) {
    const allValid =
      data.selectedServiceTypes.length > 0 &&
      data.selectedServiceTypes.every((t) =>
        isServiceTiersValid(data.servicesData[t] ?? EMPTY_SERVICE_FORM_DATA),
      )
    const filled = allValid ? 2 : data.selectedServiceTypes.length > 0 ? 1 : 0

    const optionalChecks = data.selectedServiceTypes.flatMap((t) => {
      const sd = data.servicesData[t] ?? EMPTY_SERVICE_FORM_DATA
      return [
        sd.description.trim().length > 0 || sd.inclusions.length > 0,
        sd.acceptedSpecies.length > 0,
        sd.sizeSurcharges.length > 0,
        sd.addons.length > 0,
      ]
    })
    return {
      required: 2,
      filled,
      optional: optionalChecks.length,
      optionalFilled: optionalChecks.filter(Boolean).length,
    }
  }
  return { required: 0, filled: 0, optional: 0, optionalFilled: 0 }
}

interface StepProgressProps {
  formData: OnboardingFormData
  step: OnboardingStepNumber
}

export default function StepProgress({ formData, step }: StepProgressProps) {
  const status = computeStepStatus(formData, step)
  if (status.required === 0 && status.optional === 0) return null
  const requiredPercent =
    status.required > 0 ? Math.round((status.filled / status.required) * 100) : 100
  const allCount = status.required + status.optional
  const allFilled = status.filled + status.optionalFilled
  const percent = allCount > 0 ? Math.round((allFilled / allCount) * 100) : 0
  const requiredDone = status.filled === status.required

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-700">
          Заповнено: <span className="font-medium">{allFilled} з {allCount}</span>
        </span>
        <span
          className={cn(
            'text-xs font-medium',
            requiredDone ? 'text-emerald-700' : 'text-amber-700',
          )}
        >
          {requiredDone ? 'Можна йти далі' : `Обовʼязково: ${status.filled}/${status.required}`}
        </span>
      </div>
      <div className="w-full bg-white rounded-full h-1.5 overflow-hidden border border-zinc-200">
        <div
          className={cn(
            'h-full transition-all',
            requiredDone ? 'bg-emerald-500' : 'bg-amber-500',
          )}
          style={{ width: `${Math.max(percent, requiredPercent)}%` }}
        />
      </div>
    </div>
  )
}
