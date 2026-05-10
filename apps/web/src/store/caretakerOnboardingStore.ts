import { create } from 'zustand'
import type {
  AddonPriceUnit,
  CaretakerSkill,
  CatSize,
  DogSize,
  HomeCondition,
  Language,
  PetAgeGroup,
  PriceUnit,
  ServiceType,
} from '@pet-care/shared'

// Стан wizard-а реєстрації виконавця. Без `persist` — якщо юзер вийшов
// не завершивши, при наступному заході wizard стартує з чистого аркуша.
export type OnboardingStepNumber = 1 | 2 | 3 | 4 | 5
const TOTAL_STEPS: OnboardingStepNumber = 5

export interface SizeSurchargeInput {
  petSpecies: 'DOG' | 'CAT'
  size: string
  surchargeAmount: number
}

export interface ServiceAddonInput {
  name: string
  description: string
  price: number
  priceUnit: AddonPriceUnit
}

export interface ServiceTierInput {
  durationMinutes: number | null
  basePrice: number | null
  priceUnit: PriceUnit
}

// Усі види тваринок, яких caretaker може приймати на послугу. Для WALKING
// дозволені тільки DOG/CAT. Для інших послуг — будь-які.
export type PetSpecies = 'DOG' | 'CAT' | 'RODENT' | 'BIRD' | 'OTHER'

// Дані однієї послуги. У store зберігаємо мапу `servicesData[ServiceType]`,
// щоб можна було редагувати кілька послуг паралельно (multi-service).
export interface ServiceFormData {
  tiers: ServiceTierInput[]
  description: string
  inclusions: string[] // що входить у вартість (буде злито в description при submit)
  sizeSurcharges: SizeSurchargeInput[]
  addons: ServiceAddonInput[]
  acceptedSpecies: PetSpecies[]
  acceptedDogSizes: DogSize[]
  acceptedCatSizes: CatSize[]
  acceptedAgeGroups: PetAgeGroup[]
  acceptsSpecialNeedsPets: boolean
  homeConditions: HomeCondition[]
  maxPetsAtOnce: number
}

export const EMPTY_SERVICE_FORM_DATA: ServiceFormData = {
  tiers: [],
  description: '',
  inclusions: [],
  sizeSurcharges: [],
  addons: [],
  acceptedSpecies: [],
  acceptedDogSizes: [],
  acceptedCatSizes: [],
  acceptedAgeGroups: [],
  acceptsSpecialNeedsPets: false,
  homeConditions: [],
  maxPetsAtOnce: 1,
}

export interface OnboardingFormData {
  // Step 1: Особисті дані (User-level)
  firstName: string
  lastName: string
  phone: string
  avatarUrl: string
  // Адреса проживання користувача (User-level, без коордіт — просто текст
  // для рахунків/контактів). Карту і пошук використовуємо лише для UX.
  userCountry: string
  userCity: string
  userStreet: string
  userApartment: string
  userFloor: string
  userEntrance: string
  userAddressLabel: string

  // Step 2: Про вас (як виконавця)
  bio: string
  experienceYears: number | null
  skills: CaretakerSkill[]
  languages: Language[]
  // Файли, які чекають на upload — заливаються у CARETAKER_GALLERY після
  // створення профілю в Step 5 (бо потрібен caretakerProfile.id як ownerId).
  galleryFiles: File[]

  // Step 3: Локація
  serviceLatitude: number | null
  serviceLongitude: number | null
  radiusKm: number
  addressIsPublic: boolean
  addressLabel: string
  country: string
  city: string
  street: string
  apartment: string
  floor: string
  entrance: string

  // Step 4: Послуги (multi)
  selectedServiceTypes: ServiceType[]
  editingServiceType: ServiceType | null
  servicesData: Partial<Record<ServiceType, ServiceFormData>>
}

const INITIAL_FORM: OnboardingFormData = {
  firstName: '',
  lastName: '',
  phone: '',
  avatarUrl: '',
  userCountry: '',
  userCity: '',
  userStreet: '',
  userApartment: '',
  userFloor: '',
  userEntrance: '',
  userAddressLabel: '',

  bio: '',
  experienceYears: null,
  skills: [],
  languages: [],
  galleryFiles: [],

  serviceLatitude: null,
  serviceLongitude: null,
  radiusKm: 5,
  addressIsPublic: false,
  addressLabel: '',
  country: '',
  city: '',
  street: '',
  apartment: '',
  floor: '',
  entrance: '',

  selectedServiceTypes: [],
  editingServiceType: null,
  servicesData: {},
}

interface OnboardingState {
  currentStep: OnboardingStepNumber
  maxVisitedStep: OnboardingStepNumber
  formData: OnboardingFormData
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: OnboardingStepNumber) => void
  setField: <K extends keyof OnboardingFormData>(
    key: K,
    value: OnboardingFormData[K],
  ) => void
  // Service-level actions
  toggleServiceType: (t: ServiceType) => void
  setEditingServiceType: (t: ServiceType | null) => void
  setServiceField: <K extends keyof ServiceFormData>(
    serviceType: ServiceType,
    key: K,
    value: ServiceFormData[K],
  ) => void
  reset: () => void
}

export const useCaretakerOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: 1,
  maxVisitedStep: 1,
  formData: INITIAL_FORM,

  nextStep: () =>
    set((state) => {
      const next = Math.min(state.currentStep + 1, TOTAL_STEPS) as OnboardingStepNumber
      return {
        currentStep: next,
        maxVisitedStep: Math.max(state.maxVisitedStep, next) as OnboardingStepNumber,
      }
    }),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 1) as OnboardingStepNumber,
    })),

  goToStep: (step) =>
    set((state) => ({
      currentStep: step,
      maxVisitedStep: Math.max(state.maxVisitedStep, step) as OnboardingStepNumber,
    })),

  setField: (key, value) =>
    set((state) => ({
      formData: { ...state.formData, [key]: value },
    })),

  toggleServiceType: (t) =>
    set((state) => {
      const isSelected = state.formData.selectedServiceTypes.includes(t)
      if (isSelected) {
        // Прибираємо тип з списку та з servicesData
        const newSelected = state.formData.selectedServiceTypes.filter((x) => x !== t)
        const newData = { ...state.formData.servicesData }
        delete newData[t]
        const newEditing =
          state.formData.editingServiceType === t
            ? newSelected[0] ?? null
            : state.formData.editingServiceType
        return {
          formData: {
            ...state.formData,
            selectedServiceTypes: newSelected,
            servicesData: newData,
            editingServiceType: newEditing,
          },
        }
      }
      // Додаємо тип з порожніми даними. Якщо це перша обрана послуга — стає editing.
      return {
        formData: {
          ...state.formData,
          selectedServiceTypes: [...state.formData.selectedServiceTypes, t],
          servicesData: {
            ...state.formData.servicesData,
            [t]: { ...EMPTY_SERVICE_FORM_DATA },
          },
          editingServiceType:
            state.formData.editingServiceType === null
              ? t
              : state.formData.editingServiceType,
        },
      }
    }),

  setEditingServiceType: (t) =>
    set((state) => ({
      formData: { ...state.formData, editingServiceType: t },
    })),

  setServiceField: (serviceType, key, value) =>
    set((state) => {
      const current = state.formData.servicesData[serviceType] ?? { ...EMPTY_SERVICE_FORM_DATA }
      return {
        formData: {
          ...state.formData,
          servicesData: {
            ...state.formData.servicesData,
            [serviceType]: { ...current, [key]: value },
          },
        },
      }
    }),

  reset: () => set({ currentStep: 1, maxVisitedStep: 1, formData: INITIAL_FORM }),
}))
