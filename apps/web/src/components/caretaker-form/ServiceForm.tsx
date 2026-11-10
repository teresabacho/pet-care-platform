import { Plus, Trash2, Check, X } from 'lucide-react'
import {
  ADDON_TEMPLATES,
  AddonPriceUnit,
  AdditionalServiceCapability,
  BirdType,
  CatSize,
  DayType,
  DEFAULT_PRICE_UNIT,
  DogSize,
  HomeCondition,
  INCLUSION_TEMPLATES,
  OtherPetType,
  PetAgeGroup,
  PriceUnit,
  RodentType,
  ServiceType,
  TIER_DURATION_TEMPLATES,
} from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ADDON_PRICE_UNIT_LABELS,
  BIRD_TYPE_LABELS,
  CAPABILITY_LABELS,
  CAT_SIZE_LABELS,
  DOG_SIZE_LABELS,
  HOME_CONDITION_LABELS,
  OTHER_PET_TYPE_LABELS,
  PET_AGE_GROUP_LABELS,
  PRICE_UNIT_LABELS,
  RODENT_TYPE_LABELS,
  SERVICE_TYPE_LABELS,
} from '../../lib/caretaker-labels'
import type {
  CreateServiceOfferingDto,
  UpdateServiceOfferingDto,
} from '../../services/service-offerings.service'
import type { ServiceOffering } from '../../types'
import { cn } from '@/lib/utils'

// ----------------------------------------------------------------------------
// Types

export interface TierInput {
  id?: string
  durationMinutes: number | null
  basePrice: number | null
  priceUnit: PriceUnit
  dayType: DayType
}

export interface SurchargeInput {
  petSpecies: 'DOG' | 'CAT'
  size: string
  surchargeAmount: number
}

export interface AddonInput {
  name: string
  description: string
  price: number
  priceUnit: AddonPriceUnit
}

export interface PolicyState {
  acceptedDogSizes: DogSize[]
  acceptedCatSizes: CatSize[]
  acceptedAgeGroups: PetAgeGroup[]
  acceptsSpecialNeedsPets: boolean
  capabilities: AdditionalServiceCapability[]
  maxDogsAtOnce: number
  homeConditions: HomeCondition[]
  acceptedRodentTypes: RodentType[]
  acceptedBirdTypes: BirdType[]
  acceptedOtherPetTypes: OtherPetType[]
}

export interface ServiceFormValue {
  serviceType: ServiceType
  description: string
  tiers: TierInput[]
  surcharges: SurchargeInput[]
  addons: AddonInput[]
  inclusions: string[]
  policy: PolicyState
  experienceDescription: string
  experienceSkills: string[]
}

interface ServiceFormProps {
  value: ServiceFormValue
  onChange: (next: ServiceFormValue) => void
  /** true — заборонити зміну serviceType (edit-режим) */
  lockType?: boolean
  /** Список доступних типів (для create — щоб приховати вже зайняті) */
  availableTypes?: ServiceType[]
}

// Усі типи послуг тепер мають policy (для PET_SITTING/BOARDING/GROOMING/VET_VISIT —
// з підтримкою прийому додаткових видів тваринок).
const POLICY_TYPES: ServiceType[] = [
  ServiceType.WALKING,
  ServiceType.PET_SITTING,
  ServiceType.BOARDING,
  ServiceType.GROOMING,
  ServiceType.VET_VISIT,
]

// Типи послуг, для яких є сенс приймати гризунів/птахів/інших — все, крім вигулу.
const MULTI_SPECIES_TYPES: ServiceType[] = [
  ServiceType.PET_SITTING,
  ServiceType.BOARDING,
  ServiceType.GROOMING,
  ServiceType.VET_VISIT,
]

const TABS = [
  { id: 'general', label: 'Загальне' },
  { id: 'experience', label: 'Досвід' },
  { id: 'tiers', label: 'Тарифи' },
  { id: 'policy', label: 'Правила' },
  { id: 'inclusions', label: 'Що входить' },
  { id: 'sizes', label: 'Ціна за розміром' },
  { id: 'addons', label: 'Додаткові послуги' },
] as const
type TabId = (typeof TABS)[number]['id']

// ----------------------------------------------------------------------------
// Defaults / converters

export const EMPTY_POLICY: PolicyState = {
  acceptedDogSizes: Object.values(DogSize),
  acceptedCatSizes: Object.values(CatSize),
  acceptedAgeGroups: Object.values(PetAgeGroup),
  acceptsSpecialNeedsPets: false,
  capabilities: [],
  maxDogsAtOnce: 1,
  homeConditions: [],
  acceptedRodentTypes: [],
  acceptedBirdTypes: [],
  acceptedOtherPetTypes: [],
}

export function emptyServiceFormValue(
  serviceType: ServiceType,
): ServiceFormValue {
  return {
    serviceType,
    description: '',
    tiers: [
      {
        durationMinutes: serviceType === ServiceType.WALKING ? 60 : null,
        basePrice: null,
        priceUnit: DEFAULT_PRICE_UNIT[serviceType],
        dayType: DayType.REGULAR,
      },
    ],
    surcharges: [],
    addons: [],
    inclusions: [],
    policy: EMPTY_POLICY,
    experienceDescription: '',
    experienceSkills: [],
  }
}

export function serviceFormValueFromOffering(
  s: ServiceOffering,
): ServiceFormValue {
  const policy: PolicyState = (() => {
    if (s.walkingPolicy) {
      return {
        ...EMPTY_POLICY,
        acceptedDogSizes: s.walkingPolicy.acceptedDogSizes,
        acceptedCatSizes: s.walkingPolicy.acceptedCatSizes,
        acceptedAgeGroups: s.walkingPolicy.acceptedAgeGroups,
        acceptsSpecialNeedsPets: s.walkingPolicy.acceptsSpecialNeedsPets,
        capabilities: s.walkingPolicy.capabilities,
        maxDogsAtOnce: s.walkingPolicy.maxDogsAtOnce,
      }
    }
    if (s.petSittingPolicy) {
      return {
        ...EMPTY_POLICY,
        acceptedDogSizes: s.petSittingPolicy.acceptedDogSizes,
        acceptedCatSizes: s.petSittingPolicy.acceptedCatSizes,
        acceptedAgeGroups: s.petSittingPolicy.acceptedAgeGroups,
        acceptsSpecialNeedsPets: s.petSittingPolicy.acceptsSpecialNeedsPets,
        capabilities: s.petSittingPolicy.capabilities,
        acceptedRodentTypes: s.petSittingPolicy.acceptedRodentTypes,
        acceptedBirdTypes: s.petSittingPolicy.acceptedBirdTypes,
        acceptedOtherPetTypes: s.petSittingPolicy.acceptedOtherPetTypes,
      }
    }
    if (s.boardingPolicy) {
      return {
        ...EMPTY_POLICY,
        acceptedDogSizes: s.boardingPolicy.acceptedDogSizes,
        acceptedCatSizes: s.boardingPolicy.acceptedCatSizes,
        acceptedAgeGroups: s.boardingPolicy.acceptedAgeGroups,
        acceptsSpecialNeedsPets: s.boardingPolicy.acceptsSpecialNeedsPets,
        capabilities: s.boardingPolicy.capabilities,
        homeConditions: s.boardingPolicy.homeConditions,
        acceptedRodentTypes: s.boardingPolicy.acceptedRodentTypes,
        acceptedBirdTypes: s.boardingPolicy.acceptedBirdTypes,
        acceptedOtherPetTypes: s.boardingPolicy.acceptedOtherPetTypes,
      }
    }
    if (s.groomingPolicy) {
      return {
        ...EMPTY_POLICY,
        acceptedDogSizes: s.groomingPolicy.acceptedDogSizes,
        acceptedCatSizes: s.groomingPolicy.acceptedCatSizes,
        acceptedAgeGroups: s.groomingPolicy.acceptedAgeGroups,
        acceptsSpecialNeedsPets: s.groomingPolicy.acceptsSpecialNeedsPets,
        capabilities: s.groomingPolicy.capabilities,
        acceptedRodentTypes: s.groomingPolicy.acceptedRodentTypes,
        acceptedBirdTypes: s.groomingPolicy.acceptedBirdTypes,
        acceptedOtherPetTypes: s.groomingPolicy.acceptedOtherPetTypes,
      }
    }
    if (s.vetVisitPolicy) {
      return {
        ...EMPTY_POLICY,
        acceptedDogSizes: s.vetVisitPolicy.acceptedDogSizes,
        acceptedCatSizes: s.vetVisitPolicy.acceptedCatSizes,
        acceptedAgeGroups: s.vetVisitPolicy.acceptedAgeGroups,
        acceptsSpecialNeedsPets: s.vetVisitPolicy.acceptsSpecialNeedsPets,
        capabilities: s.vetVisitPolicy.capabilities,
        acceptedRodentTypes: s.vetVisitPolicy.acceptedRodentTypes,
        acceptedBirdTypes: s.vetVisitPolicy.acceptedBirdTypes,
        acceptedOtherPetTypes: s.vetVisitPolicy.acceptedOtherPetTypes,
      }
    }
    return EMPTY_POLICY
  })()

  return {
    serviceType: s.serviceType,
    description: s.description ?? '',
    tiers: (s.tiers ?? []).map((t) => ({
      id: t.id,
      durationMinutes: t.durationMinutes,
      basePrice: Number(t.basePrice),
      priceUnit: t.priceUnit,
      dayType: t.dayType ?? DayType.REGULAR,
    })),
    surcharges: (s.sizeSurcharges ?? []).map((sc) => ({
      petSpecies: sc.petSpecies,
      size: sc.size,
      surchargeAmount: Number(sc.surchargeAmount),
    })),
    addons: (s.addons ?? []).map((a) => ({
      name: a.name,
      description: a.description ?? '',
      price: Number(a.price),
      priceUnit: a.priceUnit,
    })),
    inclusions: (s.inclusions ?? []).map((i) => i.text),
    policy,
    experienceDescription: s.experienceDescription ?? '',
    experienceSkills: s.experienceSkills ?? [],
  }
}

export function isServiceFormValid(value: ServiceFormValue): boolean {
  const validTiers = value.tiers.filter(
    (t) => t.basePrice !== null && t.basePrice > 0,
  )
  return validTiers.length > 0
}

// ----------------------------------------------------------------------------
// DTO builders

export function buildCreateDto(
  value: ServiceFormValue,
): CreateServiceOfferingDto {
  const validTiers = value.tiers.filter(
    (t) => t.basePrice !== null && t.basePrice > 0,
  )
  const dto: CreateServiceOfferingDto = {
    serviceType: value.serviceType,
    description: value.description.trim() || undefined,
    experienceDescription: value.experienceDescription.trim() || undefined,
    experienceSkills:
      value.experienceSkills.length > 0 ? value.experienceSkills : undefined,
    tiers: validTiers.map((t) => ({
      durationMinutes: t.durationMinutes ?? undefined,
      basePrice: t.basePrice as number,
      priceUnit: t.priceUnit,
      dayType: t.dayType,
    })),
    sizeSurcharges:
      value.surcharges.length > 0
        ? value.surcharges.map((s) => ({
            petSpecies: s.petSpecies,
            size: s.size,
            surchargeAmount: s.surchargeAmount,
          }))
        : undefined,
    addons:
      value.addons.length > 0
        ? value.addons.map((a) => ({
            name: a.name.trim(),
            description: a.description.trim() || undefined,
            price: a.price,
            priceUnit: a.priceUnit,
          }))
        : undefined,
    inclusions:
      value.inclusions.length > 0
        ? value.inclusions.map((text) => ({ text }))
        : undefined,
  }
  attachPolicy(dto, value)
  return dto
}

export function buildUpdateDto(
  value: ServiceFormValue,
): UpdateServiceOfferingDto {
  const validTiers = value.tiers.filter(
    (t) => t.basePrice !== null && t.basePrice > 0,
  )
  const dto: UpdateServiceOfferingDto = {
    description: value.description.trim() || null,
    experienceDescription: value.experienceDescription.trim() || null,
    experienceSkills: value.experienceSkills,
    tiers: validTiers.map((t) => ({
      id: t.id,
      durationMinutes: t.durationMinutes ?? null,
      basePrice: t.basePrice as number,
      priceUnit: t.priceUnit,
      dayType: t.dayType,
    })),
    sizeSurcharges: value.surcharges.map((s) => ({
      petSpecies: s.petSpecies,
      size: s.size,
      surchargeAmount: s.surchargeAmount,
    })),
    addons: value.addons.map((a) => ({
      name: a.name.trim(),
      description: a.description.trim() || undefined,
      price: a.price,
      priceUnit: a.priceUnit,
    })),
    inclusions: value.inclusions.map((text) => ({ text })),
  }
  attachPolicy(dto, value)
  return dto
}

function attachPolicy(
  dto: CreateServiceOfferingDto | UpdateServiceOfferingDto,
  value: ServiceFormValue,
): void {
  const baseFields = {
    acceptedDogSizes:
      value.policy.acceptedDogSizes.length > 0
        ? value.policy.acceptedDogSizes
        : Object.values(DogSize),
    acceptedAgeGroups:
      value.policy.acceptedAgeGroups.length > 0
        ? value.policy.acceptedAgeGroups
        : Object.values(PetAgeGroup),
    acceptsSpecialNeedsPets: value.policy.acceptsSpecialNeedsPets,
    capabilities: value.policy.capabilities,
  }
  const catSizes =
    value.policy.acceptedCatSizes.length > 0
      ? value.policy.acceptedCatSizes
      : Object.values(CatSize)
  const multiSpecies = {
    acceptedRodentTypes: value.policy.acceptedRodentTypes,
    acceptedBirdTypes: value.policy.acceptedBirdTypes,
    acceptedOtherPetTypes: value.policy.acceptedOtherPetTypes,
  }

  if (value.serviceType === ServiceType.WALKING) {
    dto.walkingPolicy = {
      ...baseFields,
      acceptedCatSizes: catSizes,
      maxDogsAtOnce: value.policy.maxDogsAtOnce,
    }
  } else if (value.serviceType === ServiceType.PET_SITTING) {
    dto.petSittingPolicy = {
      ...baseFields,
      acceptedCatSizes: catSizes,
      ...multiSpecies,
    }
  } else if (value.serviceType === ServiceType.BOARDING) {
    dto.boardingPolicy = {
      ...baseFields,
      acceptedCatSizes: catSizes,
      homeConditions: value.policy.homeConditions,
      ...multiSpecies,
    }
  } else if (value.serviceType === ServiceType.GROOMING) {
    dto.groomingPolicy = {
      ...baseFields,
      acceptedCatSizes: catSizes,
      ...multiSpecies,
    }
  } else if (value.serviceType === ServiceType.VET_VISIT) {
    dto.vetVisitPolicy = {
      ...baseFields,
      acceptedCatSizes: catSizes,
      ...multiSpecies,
    }
  }
}

// ----------------------------------------------------------------------------
// Component

import { useState } from 'react'

export function ServiceForm({
  value,
  onChange,
  lockType = false,
  availableTypes,
}: ServiceFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general')

  const showsPolicyTab = POLICY_TYPES.includes(value.serviceType)
  const tabsToShow = TABS.filter((t) => t.id !== 'policy' || showsPolicyTab)

  function patch<K extends keyof ServiceFormValue>(
    key: K,
    next: ServiceFormValue[K],
  ) {
    onChange({ ...value, [key]: next })
  }

  function handleTypeChange(next: ServiceType) {
    onChange({
      ...value,
      serviceType: next,
      tiers: [
        {
          durationMinutes: next === ServiceType.WALKING ? 60 : null,
          basePrice: null,
          priceUnit: DEFAULT_PRICE_UNIT[next],
          dayType: DayType.REGULAR,
        },
      ],
    })
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-zinc-200">
        <div className="flex flex-wrap gap-1 -mb-px">
          {tabsToShow.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-2 text-sm border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-zinc-900 text-zinc-900 font-medium'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        {activeTab === 'general' && (
          <GeneralPane
            lockType={lockType}
            availableTypes={availableTypes}
            serviceType={value.serviceType}
            description={value.description}
            onTypeChange={handleTypeChange}
            onDescriptionChange={(v) => patch('description', v)}
          />
        )}
        {activeTab === 'experience' && (
          <ExperiencePane
            serviceType={value.serviceType}
            description={value.experienceDescription}
            skills={value.experienceSkills}
            setDescription={(v) => patch('experienceDescription', v)}
            setSkills={(v) => patch('experienceSkills', v)}
          />
        )}
        {activeTab === 'tiers' && (
          <TiersPane
            serviceType={value.serviceType}
            tiers={value.tiers}
            setTiers={(t) => patch('tiers', t)}
          />
        )}
        {activeTab === 'policy' && showsPolicyTab && (
          <PolicyPane
            serviceType={value.serviceType}
            policy={value.policy}
            setPolicy={(updater) =>
              patch(
                'policy',
                typeof updater === 'function'
                  ? (updater as (p: PolicyState) => PolicyState)(value.policy)
                  : updater,
              )
            }
          />
        )}
        {activeTab === 'inclusions' && (
          <InclusionsPane
            serviceType={value.serviceType}
            inclusions={value.inclusions}
            setInclusions={(v) => patch('inclusions', v)}
          />
        )}
        {activeTab === 'sizes' && (
          <SizesPane
            surcharges={value.surcharges}
            setSurcharges={(s) => patch('surcharges', s)}
          />
        )}
        {activeTab === 'addons' && (
          <AddonsPane
            serviceType={value.serviceType}
            addons={value.addons}
            setAddons={(a) => patch('addons', a)}
          />
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Panes

interface GeneralPaneProps {
  lockType: boolean
  availableTypes?: ServiceType[]
  serviceType: ServiceType
  description: string
  onTypeChange: (t: ServiceType) => void
  onDescriptionChange: (v: string) => void
}

function GeneralPane({
  lockType,
  availableTypes,
  serviceType,
  description,
  onTypeChange,
  onDescriptionChange,
}: GeneralPaneProps) {
  const types = availableTypes ?? Object.values(ServiceType)

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="sf-type">Тип послуги</Label>
        {lockType ? (
          <Input
            id="sf-type"
            value={SERVICE_TYPE_LABELS[serviceType]}
            disabled
          />
        ) : (
          <Select
            value={serviceType}
            onValueChange={(v) => onTypeChange(v as ServiceType)}
          >
            <SelectTrigger id="sf-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {SERVICE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-zinc-500">
          {lockType
            ? 'Тип послуги змінити не можна.'
            : 'Тип не можна змінити після створення послуги.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sf-desc">Опис (опціонально)</Label>
        <Textarea
          id="sf-desc"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Що включає послуга, як проходить, особливості…"
          rows={4}
        />
      </div>
    </div>
  )
}

interface TiersPaneProps {
  serviceType: ServiceType
  tiers: TierInput[]
  setTiers: (next: TierInput[]) => void
}

function TiersPane({ serviceType, tiers, setTiers }: TiersPaneProps) {
  const templates = TIER_DURATION_TEMPLATES[serviceType]
  const showsDuration =
    DEFAULT_PRICE_UNIT[serviceType] === PriceUnit.PER_SESSION ||
    DEFAULT_PRICE_UNIT[serviceType] === PriceUnit.PER_HOUR

  function update(idx: number, p: Partial<TierInput>) {
    setTiers(tiers.map((t, i) => (i === idx ? { ...t, ...p } : t)))
  }
  function add(durationMinutes: number | null = null, dayType: DayType = DayType.REGULAR) {
    setTiers([
      ...tiers,
      {
        durationMinutes,
        basePrice: null,
        priceUnit: DEFAULT_PRICE_UNIT[serviceType],
        dayType,
      },
    ])
  }
  function duplicateForDayType(idx: number, dayType: DayType) {
    const src = tiers[idx]
    if (!src) return
    setTiers([
      ...tiers,
      {
        durationMinutes: src.durationMinutes,
        basePrice: src.basePrice,
        priceUnit: src.priceUnit,
        dayType,
      },
    ])
  }
  function remove(idx: number) {
    if (tiers.length <= 1) return
    setTiers(tiers.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Ціни — для тваринки розміру MEDIUM. Для інших розмірів додайте надбавку
        у вкладці «Ціна за розміром». Мінімум один тариф.
      </p>

      {showsDuration && templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {templates
            .filter((tt) => !tiers.some((t) => t.durationMinutes === tt.minutes))
            .map((tt) => (
              <button
                key={tt.label}
                type="button"
                onClick={() => add(tt.minutes)}
                className="px-3 py-1 rounded-full border border-zinc-300 text-xs text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50"
              >
                + {tt.label}
              </button>
            ))}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        За замовчуванням тариф діє в усі дні. Можна додати окремі ціни для
        вихідних чи свят — для тієї ж тривалості. Сервер сам застосує правильну
        ставку на дату бронювання.
      </p>

      <div className="space-y-2">
        {tiers.map((t, idx) => {
          const hasWeekendVariant = tiers.some(
            (other, i) =>
              i !== idx &&
              other.durationMinutes === t.durationMinutes &&
              other.dayType === DayType.WEEKEND,
          )
          const hasHolidayVariant = tiers.some(
            (other, i) =>
              i !== idx &&
              other.durationMinutes === t.durationMinutes &&
              other.dayType === DayType.HOLIDAY,
          )
          return (
            <div
              key={t.id ?? `new-${idx}`}
              className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 p-2 bg-zinc-50"
            >
              {showsDuration ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    value={t.durationMinutes ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      update(idx, {
                        durationMinutes: v === '' ? null : Number(v),
                      })
                    }}
                    placeholder="хв"
                    className="w-20"
                  />
                  <span className="text-xs text-zinc-500">хв</span>
                </div>
              ) : (
                <div className="flex-1 text-sm text-zinc-600">
                  {PRICE_UNIT_LABELS[t.priceUnit]}
                </div>
              )}
              <Select
                value={t.dayType}
                onValueChange={(v) => update(idx, { dayType: v as DayType })}
              >
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DayType.REGULAR}>Звичайний</SelectItem>
                  <SelectItem value={DayType.WEEKEND}>Вихідні</SelectItem>
                  <SelectItem value={DayType.HOLIDAY}>Свято</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                value={t.basePrice ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  update(idx, { basePrice: v === '' ? null : Number(v) })
                }}
                placeholder="200"
                className="w-24"
              />
              <span className="text-xs text-zinc-500">грн</span>
              {t.dayType === DayType.REGULAR && !hasWeekendVariant && (
                <button
                  type="button"
                  onClick={() => duplicateForDayType(idx, DayType.WEEKEND)}
                  className="text-xs text-zinc-600 underline hover:text-zinc-900"
                >
                  + вихідні
                </button>
              )}
              {t.dayType === DayType.REGULAR && !hasHolidayVariant && (
                <button
                  type="button"
                  onClick={() => duplicateForDayType(idx, DayType.HOLIDAY)}
                  className="text-xs text-zinc-600 underline hover:text-zinc-900"
                >
                  + свято
                </button>
              )}
              {tiers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(idx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => add()}>
          <Plus className="w-4 h-4 mr-1" />
          Додати тариф
        </Button>
      </div>
    </div>
  )
}

interface SizesPaneProps {
  surcharges: SurchargeInput[]
  setSurcharges: (next: SurchargeInput[]) => void
}

function SizesPane({ surcharges, setSurcharges }: SizesPaneProps) {
  function get(species: 'DOG' | 'CAT', size: string): number | null {
    return (
      surcharges.find((s) => s.petSpecies === species && s.size === size)
        ?.surchargeAmount ?? null
    )
  }
  function set(species: 'DOG' | 'CAT', size: string, val: number | null) {
    const next = surcharges.filter(
      (s) => !(s.petSpecies === species && s.size === size),
    )
    if (val !== null && val !== 0) {
      next.push({ petSpecies: species, size, surchargeAmount: val })
    }
    setSurcharges(next)
  }

  const dogSizes = Object.values(DogSize)
  const catSizes = Object.values(CatSize)

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Скільки дорожче (або дешевше) для не-MEDIUM розмірів. MEDIUM завжди
        дорівнює базовій ціні. Залиште поле порожнім для розмірів без надбавки.
      </p>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-zinc-500">
          Собаки
        </Label>
        {dogSizes.map((size) => {
          const isMedium = size === DogSize.MEDIUM
          return (
            <div key={`dog-${size}`} className="flex items-center gap-3">
              <span className="text-sm text-zinc-700 flex-1">
                {DOG_SIZE_LABELS[size]}
              </span>
              <Input
                type="number"
                className="w-32"
                disabled={isMedium}
                value={isMedium ? 0 : (get('DOG', size) ?? '')}
                onChange={(e) =>
                  set(
                    'DOG',
                    size,
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
                placeholder={isMedium ? '0' : '+50 / -30'}
              />
              <span className="text-xs text-zinc-500 w-12">грн</span>
            </div>
          )
        })}
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-zinc-500">
          Коти
        </Label>
        {catSizes.map((size) => {
          const isMedium = size === CatSize.MEDIUM
          return (
            <div key={`cat-${size}`} className="flex items-center gap-3">
              <span className="text-sm text-zinc-700 flex-1">
                {CAT_SIZE_LABELS[size]}
              </span>
              <Input
                type="number"
                className="w-32"
                disabled={isMedium}
                value={isMedium ? 0 : (get('CAT', size) ?? '')}
                onChange={(e) =>
                  set(
                    'CAT',
                    size,
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
                placeholder={isMedium ? '0' : '+30 / -10'}
              />
              <span className="text-xs text-zinc-500 w-12">грн</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface InclusionsPaneProps {
  serviceType: ServiceType
  inclusions: string[]
  setInclusions: (next: string[]) => void
}

function InclusionsPane({
  serviceType,
  inclusions,
  setInclusions,
}: InclusionsPaneProps) {
  const templates = INCLUSION_TEMPLATES[serviceType]
  const [customDraft, setCustomDraft] = useState('')

  function toggle(text: string) {
    if (inclusions.includes(text)) {
      setInclusions(inclusions.filter((x) => x !== text))
    } else {
      setInclusions([...inclusions, text])
    }
  }
  function addCustom() {
    const trimmed = customDraft.trim()
    if (!trimmed || inclusions.includes(trimmed)) return
    setInclusions([...inclusions, trimmed])
    setCustomDraft('')
  }
  function remove(text: string) {
    setInclusions(inclusions.filter((x) => x !== text))
  }

  const customSelected = inclusions.filter((t) => !templates.includes(t))

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Що клієнт отримує у базовій ціні. Натисніть на готовий пункт, щоб
        додати, або впишіть свій нижче.
      </p>

      <div className="flex flex-wrap gap-2">
        {templates.map((text) => {
          const active = inclusions.includes(text)
          return (
            <button
              key={text}
              type="button"
              onClick={() => toggle(text)}
              className={cn(
                'px-3 py-1.5 rounded-full border text-xs transition-colors flex items-center gap-1',
                active
                  ? 'bg-zinc-900 border-zinc-900 text-white'
                  : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-500',
              )}
            >
              {active && <Check className="w-3 h-3" />}
              {text}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          placeholder="Свій пункт (наприклад, дзвінок власнику після прогулянки)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addCustom}>
          Додати
        </Button>
      </div>

      {customSelected.length > 0 && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 space-y-1">
          <p className="text-xs text-zinc-500">Ваші пункти:</p>
          {customSelected.map((text) => (
            <div
              key={text}
              className="flex items-center justify-between gap-2 text-sm text-zinc-800"
            >
              <span>{text}</span>
              <button
                type="button"
                onClick={() => remove(text)}
                className="text-xs text-zinc-500 hover:text-destructive"
              >
                видалити
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface AddonsPaneProps {
  serviceType: ServiceType
  addons: AddonInput[]
  setAddons: (next: AddonInput[]) => void
}

function AddonsPane({ serviceType, addons, setAddons }: AddonsPaneProps) {
  const suggestions = ADDON_TEMPLATES.filter(
    (t) => !t.serviceTypes || t.serviceTypes.includes(serviceType),
  )
  const notYetAdded = suggestions.filter(
    (s) => !addons.some((a) => a.name === s.name),
  )

  function update(idx: number, p: Partial<AddonInput>) {
    setAddons(addons.map((a, i) => (i === idx ? { ...a, ...p } : a)))
  }
  function add() {
    setAddons([
      ...addons,
      { name: '', description: '', price: 0, priceUnit: AddonPriceUnit.PER_BOOKING },
    ])
  }
  function addFromTemplate(t: (typeof ADDON_TEMPLATES)[number]) {
    setAddons([
      ...addons,
      {
        name: t.name,
        description: t.description,
        price: t.defaultPrice,
        priceUnit: t.defaultPriceUnit,
      },
    ])
  }
  function remove(idx: number) {
    setAddons(addons.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Опційні платні екстри, які клієнт може обрати при бронюванні. Оберіть з
        готових пропозицій або додайте власну.
      </p>

      {notYetAdded.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500">Швидко додати з шаблонів:</p>
          <div className="flex flex-wrap gap-2">
            {notYetAdded.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => addFromTemplate(s)}
                className="px-3 py-1.5 rounded-full border border-zinc-300 bg-white text-xs text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                + {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {addons.map((a, idx) => (
        <div
          key={idx}
          className="rounded-md border border-zinc-200 p-3 space-y-2 bg-zinc-50"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Input
                value={a.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                placeholder="Наприклад, помити лапи"
              />
              <Input
                value={a.description}
                onChange={(e) => update(idx, { description: e.target.value })}
                placeholder="Опис (опц.)"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  value={a.price || ''}
                  onChange={(e) =>
                    update(idx, { price: Number(e.target.value) || 0 })
                  }
                  placeholder="50"
                />
                <Select
                  value={a.priceUnit}
                  onValueChange={(v) =>
                    update(idx, { priceUnit: v as AddonPriceUnit })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AddonPriceUnit).map((u) => (
                      <SelectItem key={u} value={u}>
                        {ADDON_PRICE_UNIT_LABELS[u]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(idx)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="w-4 h-4 mr-1" />
        Додати послугу
      </Button>
    </div>
  )
}

interface PolicyPaneProps {
  serviceType: ServiceType
  policy: PolicyState
  setPolicy: (updater: PolicyState | ((p: PolicyState) => PolicyState)) => void
}

function PolicyPane({ serviceType, policy, setPolicy }: PolicyPaneProps) {
  function patch<K extends keyof PolicyState>(key: K, val: PolicyState[K]) {
    setPolicy((prev) => ({ ...prev, [key]: val }))
  }

  return (
    <div className="space-y-4">
      <ChipsField
        label="Розміри собак"
        options={Object.values(DogSize).map((v) => ({
          value: v,
          label: DOG_SIZE_LABELS[v],
        }))}
        value={policy.acceptedDogSizes}
        onChange={(v) => patch('acceptedDogSizes', v as DogSize[])}
      />
      <ChipsField
        label="Розміри котів"
        options={Object.values(CatSize).map((v) => ({
          value: v,
          label: CAT_SIZE_LABELS[v],
        }))}
        value={policy.acceptedCatSizes}
        onChange={(v) => patch('acceptedCatSizes', v as CatSize[])}
      />
      <ChipsField
        label="Вікові групи"
        options={Object.values(PetAgeGroup).map((v) => ({
          value: v,
          label: PET_AGE_GROUP_LABELS[v],
        }))}
        value={policy.acceptedAgeGroups}
        onChange={(v) => patch('acceptedAgeGroups', v as PetAgeGroup[])}
      />
      <ChipsField
        label="Додаткові можливості"
        options={Object.values(AdditionalServiceCapability).map((v) => ({
          value: v,
          label: CAPABILITY_LABELS[v],
        }))}
        value={policy.capabilities}
        onChange={(v) =>
          patch('capabilities', v as AdditionalServiceCapability[])
        }
      />

      <div className="flex items-start gap-2">
        <input
          id="sf-special"
          type="checkbox"
          checked={policy.acceptsSpecialNeedsPets}
          onChange={(e) => patch('acceptsSpecialNeedsPets', e.target.checked)}
          className="mt-1"
        />
        <div className="flex flex-col">
          <Label htmlFor="sf-special" className="font-medium">
            Приймаю тваринок з особливими потребами
          </Label>
          <span className="text-xs text-zinc-500">
            Хронічні захворювання, обмеження мобільності тощо.
          </span>
        </div>
      </div>

      {serviceType === ServiceType.WALKING && (
        <div className="space-y-1.5">
          <Label htmlFor="sf-max-dogs">Максимум тваринок одночасно</Label>
          <Input
            id="sf-max-dogs"
            type="number"
            min={1}
            max={10}
            value={policy.maxDogsAtOnce}
            onChange={(e) =>
              patch('maxDogsAtOnce', Number(e.target.value) || 1)
            }
            className="w-32"
          />
        </div>
      )}

      {serviceType === ServiceType.BOARDING && (
        <ChipsField
          label="Умови дому"
          description="Несумісні пари (наприклад, HAS_KIDS і NO_KIDS) забороняє бекенд."
          options={Object.values(HomeCondition).map((v) => ({
            value: v,
            label: HOME_CONDITION_LABELS[v],
          }))}
          value={policy.homeConditions}
          onChange={(v) => patch('homeConditions', v as HomeCondition[])}
        />
      )}

      {MULTI_SPECIES_TYPES.includes(serviceType) && (
        <>
          <ChipsField
            label="Гризуни та кролі"
            description="Які гризуни приймаються — не вибрано означає не приймаєте."
            options={Object.values(RodentType).map((v) => ({
              value: v,
              label: RODENT_TYPE_LABELS[v],
            }))}
            value={policy.acceptedRodentTypes}
            onChange={(v) => patch('acceptedRodentTypes', v as RodentType[])}
          />
          <ChipsField
            label="Птахи"
            options={Object.values(BirdType).map((v) => ({
              value: v,
              label: BIRD_TYPE_LABELS[v],
            }))}
            value={policy.acceptedBirdTypes}
            onChange={(v) => patch('acceptedBirdTypes', v as BirdType[])}
          />
          <ChipsField
            label="Інші тваринки"
            options={Object.values(OtherPetType).map((v) => ({
              value: v,
              label: OTHER_PET_TYPE_LABELS[v],
            }))}
            value={policy.acceptedOtherPetTypes}
            onChange={(v) => patch('acceptedOtherPetTypes', v as OtherPetType[])}
          />
        </>
      )}
    </div>
  )
}

// ── ExperiencePane ─────────────────────────────────────────────────────────

interface ExperiencePaneProps {
  serviceType: ServiceType
  description: string
  skills: string[]
  setDescription: (v: string) => void
  setSkills: (v: string[]) => void
}

function ExperiencePane({
  serviceType,
  description,
  skills,
  setDescription,
  setSkills,
}: ExperiencePaneProps) {
  const [draft, setDraft] = useState('')

  function addSkill() {
    const trimmed = draft.trim()
    if (!trimmed || skills.includes(trimmed)) return
    setSkills([...skills, trimmed])
    setDraft('')
  }
  function removeSkill(s: string) {
    setSkills(skills.filter((x) => x !== s))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Розкажіть про досвід саме у цій послузі — клієнти бачать це у блоці
        «Досвід та навички — {SERVICE_TYPE_LABELS[serviceType]}» на вашій
        сторінці.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="sf-exp-desc">Опис досвіду у цій послузі</Label>
        <Textarea
          id="sf-exp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Наприклад: 5 років вигулюю собак різних розмірів, працюю з тривожними тваринками…"
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label>Теги навичок під цей тип послуги</Label>
        <p className="text-xs text-zinc-500">
          Короткі фрази, що ви вмієте робити в цій послузі. Натисніть Enter, щоб
          додати.
        </p>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Наприклад: не боюся великих собак"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSkill()
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addSkill}>
            Додати
          </Button>
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 text-white text-xs"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="hover:opacity-80"
                  aria-label={`Прибрати ${s}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ChipsFieldProps<T extends string> {
  label: string
  description?: string
  options: { value: T; label: string }[]
  value: T[]
  onChange: (next: T[]) => void
}

function ChipsField<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
}: ChipsFieldProps<T>) {
  function toggle(v: T) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-zinc-500">{description}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={cn(
                'px-3 py-1.5 rounded-full border text-xs transition-colors flex items-center gap-1',
                active
                  ? 'bg-zinc-900 border-zinc-900 text-white'
                  : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-500',
              )}
            >
              {active && <Check className="w-3 h-3" />}
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
