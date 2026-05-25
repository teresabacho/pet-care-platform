import { useEffect } from 'react'
import { Check, Circle, Plus } from 'lucide-react'
import { DayType, ServiceType } from '@pet-care/shared'
import {
  EMPTY_SERVICE_FORM_DATA,
  useCaretakerOnboardingStore,
  type ServiceFormData,
} from '../../store/caretakerOnboardingStore'
import { Button } from '@/components/ui/button'
import { SERVICE_TYPE_LABELS } from '../../lib/caretaker-labels'
import {
  ServiceForm,
  type ServiceFormValue,
} from '../caretaker-form/ServiceForm'
import { cn } from '@/lib/utils'

function isServiceComplete(data: ServiceFormData): boolean {
  return (
    data.tiers.length > 0 &&
    data.tiers.every(
      (t) =>
        t.basePrice !== null &&
        t.basePrice > 0 &&
        (t.priceUnit === 'PER_DAY' || (t.durationMinutes !== null && t.durationMinutes > 0)),
    )
  )
}

// Map wizard store ↔ ServiceForm value. Wizard store не має id/dayType
// для tiers, тому проставляємо dayType=REGULAR; capabilities — пустий
// масив, бо у wizard цього поля немає.
function dataToFormValue(
  serviceType: ServiceType,
  data: ServiceFormData,
): ServiceFormValue {
  return {
    serviceType,
    description: data.description,
    tiers: data.tiers.map((t) => ({
      durationMinutes: t.durationMinutes,
      basePrice: t.basePrice,
      priceUnit: t.priceUnit,
      dayType: DayType.REGULAR,
    })),
    surcharges: data.sizeSurcharges,
    addons: data.addons.map((a) => ({
      name: a.name,
      description: a.description,
      price: a.price,
      priceUnit: a.priceUnit,
    })),
    inclusions: data.inclusions,
    policy: {
      acceptedDogSizes: data.acceptedDogSizes,
      acceptedCatSizes: data.acceptedCatSizes,
      acceptedAgeGroups: data.acceptedAgeGroups,
      acceptsSpecialNeedsPets: data.acceptsSpecialNeedsPets,
      capabilities: [],
      maxDogsAtOnce: data.maxPetsAtOnce,
      homeConditions: data.homeConditions,
      acceptedRodentTypes: data.acceptedRodentTypes,
      acceptedBirdTypes: data.acceptedBirdTypes,
      acceptedOtherPetTypes: data.acceptedOtherPetTypes,
    },
    experienceDescription: data.experienceDescription,
    experienceSkills: data.experienceSkills,
  }
}

function formValueToData(value: ServiceFormValue): ServiceFormData {
  return {
    description: value.description,
    inclusions: value.inclusions,
    tiers: value.tiers.map((t) => ({
      durationMinutes: t.durationMinutes,
      basePrice: t.basePrice,
      priceUnit: t.priceUnit,
    })),
    sizeSurcharges: value.surcharges,
    addons: value.addons.map((a) => ({
      name: a.name,
      description: a.description,
      price: a.price,
      priceUnit: a.priceUnit,
    })),
    acceptedSpecies: [], // legacy-only; зберігаємо порожнім
    acceptedDogSizes: value.policy.acceptedDogSizes,
    acceptedCatSizes: value.policy.acceptedCatSizes,
    acceptedAgeGroups: value.policy.acceptedAgeGroups,
    acceptsSpecialNeedsPets: value.policy.acceptsSpecialNeedsPets,
    homeConditions: value.policy.homeConditions,
    maxPetsAtOnce: value.policy.maxDogsAtOnce,
    acceptedRodentTypes: value.policy.acceptedRodentTypes,
    acceptedBirdTypes: value.policy.acceptedBirdTypes,
    acceptedOtherPetTypes: value.policy.acceptedOtherPetTypes,
    experienceDescription: value.experienceDescription,
    experienceSkills: value.experienceSkills,
  }
}

export default function Step3Services() {
  const {
    formData,
    nextStep,
    prevStep,
    toggleServiceType,
    setEditingServiceType,
  } = useCaretakerOnboardingStore()
  const setStore = useCaretakerOnboardingStore.setState
  const { selectedServiceTypes, editingServiceType, servicesData } = formData

  // Якщо обрано хоча б одну послугу — встановлюємо першу в editing.
  useEffect(() => {
    if (selectedServiceTypes.length > 0 && editingServiceType === null) {
      setEditingServiceType(selectedServiceTypes[0])
    }
  }, [selectedServiceTypes, editingServiceType, setEditingServiceType])

  const editingData =
    (editingServiceType && servicesData[editingServiceType]) ||
    EMPTY_SERVICE_FORM_DATA

  const isValid =
    selectedServiceTypes.length > 0 &&
    selectedServiceTypes.every((t) =>
      isServiceComplete(servicesData[t] ?? EMPTY_SERVICE_FORM_DATA),
    )

  const availableTypes = Object.values(ServiceType).filter(
    (t) => !selectedServiceTypes.includes(t),
  )

  function handleFormChange(next: ServiceFormValue) {
    if (!editingServiceType) return
    const data = formValueToData(next)
    setStore((state) => ({
      formData: {
        ...state.formData,
        servicesData: {
          ...state.formData.servicesData,
          [editingServiceType]: data,
        },
      },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900">Послуги</h2>
        <p className="text-sm text-zinc-600">
          Оберіть усі типи послуг, які ви хочете надавати. Для кожної заповніть
          тарифи. Решту полів можна заповнити пізніше — вони підвищують довіру і
          ранжування.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-900">
          Які послуги ви надаєте?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.values(ServiceType).map((t) => {
            const selected = selectedServiceTypes.includes(t)
            const complete =
              selected &&
              isServiceComplete(servicesData[t] ?? EMPTY_SERVICE_FORM_DATA)
            return (
              <button
                type="button"
                key={t}
                onClick={() => toggleServiceType(t)}
                className={cn(
                  'rounded-lg border p-3 text-left text-sm transition-colors flex items-start gap-2',
                  selected
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400',
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {complete ? (
                    <Check className="w-4 h-4" />
                  ) : selected ? (
                    <Circle className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>
                <span className="leading-tight">{SERVICE_TYPE_LABELS[t]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {selectedServiceTypes.length > 0 && (
        <>
          {selectedServiceTypes.length > 1 && (
            <div className="flex flex-wrap gap-1 border-b border-zinc-200">
              {selectedServiceTypes.map((t) => {
                const complete = isServiceComplete(
                  servicesData[t] ?? EMPTY_SERVICE_FORM_DATA,
                )
                const isEditing = t === editingServiceType
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setEditingServiceType(t)}
                    className={cn(
                      '-mb-px px-4 py-2 text-sm border-b-2 transition-colors flex items-center gap-1.5',
                      isEditing
                        ? 'border-zinc-900 text-zinc-900 font-medium'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800',
                    )}
                  >
                    {complete && (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    {SERVICE_TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          )}

          {editingServiceType && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <ServiceForm
                value={dataToFormValue(editingServiceType, editingData)}
                onChange={handleFormChange}
                lockType
                availableTypes={availableTypes}
              />
            </div>
          )}
        </>
      )}

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
