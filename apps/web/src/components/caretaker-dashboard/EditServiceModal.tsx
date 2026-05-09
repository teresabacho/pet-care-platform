import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, Check } from 'lucide-react'
import {
  AddonPriceUnit,
  AdditionalServiceCapability,
  CatSize,
  DogSize,
  HomeCondition,
  PetAgeGroup,
  PriceUnit,
  ServiceType,
} from '@pet-care/shared'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  serviceOfferingsService,
  type CreateServiceOfferingDto,
  type UpdateServiceOfferingDto,
} from '../../services/service-offerings.service'
import {
  ADDON_PRICE_UNIT_LABELS,
  CAPABILITY_LABELS,
  CAT_SIZE_LABELS,
  DOG_SIZE_LABELS,
  HOME_CONDITION_LABELS,
  PET_AGE_GROUP_LABELS,
  PRICE_UNIT_LABELS,
  SERVICE_TYPE_LABELS,
} from '../../lib/caretaker-labels'
import {
  DEFAULT_PRICE_UNIT,
  TIER_DURATION_TEMPLATES,
} from '../../lib/service-templates'
import type { ServiceOffering } from '../../types'
import { cn } from '@/lib/utils'

type EditServiceModalProps =
  | {
      open: boolean
      onOpenChange: (open: boolean) => void
      mode: 'create'
      existingServiceTypes: ServiceType[]
      onSaved: (service: ServiceOffering) => void
    }
  | {
      open: boolean
      onOpenChange: (open: boolean) => void
      mode: 'edit'
      service: ServiceOffering
      onSaved: (service: ServiceOffering) => void
    }

interface TierInput {
  id?: string
  durationMinutes: number | null
  basePrice: number | null
  priceUnit: PriceUnit
}

interface SurchargeInput {
  petSpecies: 'DOG' | 'CAT'
  size: string
  surchargeAmount: number
}

interface AddonInput {
  name: string
  description: string
  price: number
  priceUnit: AddonPriceUnit
}

interface PolicyState {
  acceptedDogSizes: DogSize[]
  acceptedCatSizes: CatSize[]
  acceptedAgeGroups: PetAgeGroup[]
  acceptsSpecialNeedsPets: boolean
  capabilities: AdditionalServiceCapability[]
  maxDogsAtOnce: number
  homeConditions: HomeCondition[]
}

const EMPTY_POLICY: PolicyState = {
  acceptedDogSizes: Object.values(DogSize),
  acceptedCatSizes: Object.values(CatSize),
  acceptedAgeGroups: Object.values(PetAgeGroup),
  acceptsSpecialNeedsPets: false,
  capabilities: [],
  maxDogsAtOnce: 1,
  homeConditions: [],
}

const TABS = [
  { id: 'general', label: 'Загальне' },
  { id: 'tiers', label: 'Тарифи' },
  { id: 'policy', label: 'Правила' },
  { id: 'sizes', label: 'Ціна за розміром' },
  { id: 'addons', label: 'Додаткові послуги' },
] as const
type TabId = (typeof TABS)[number]['id']

const POLICY_TYPES: ServiceType[] = [
  ServiceType.WALKING,
  ServiceType.PET_SITTING,
  ServiceType.BOARDING,
]

function policyFromService(service: ServiceOffering): PolicyState {
  if (service.walkingPolicy) {
    return {
      acceptedDogSizes: service.walkingPolicy.acceptedDogSizes,
      acceptedCatSizes: service.walkingPolicy.acceptedCatSizes,
      acceptedAgeGroups: service.walkingPolicy.acceptedAgeGroups,
      acceptsSpecialNeedsPets: service.walkingPolicy.acceptsSpecialNeedsPets,
      capabilities: service.walkingPolicy.capabilities,
      maxDogsAtOnce: service.walkingPolicy.maxDogsAtOnce,
      homeConditions: [],
    }
  }
  if (service.petSittingPolicy) {
    return {
      acceptedDogSizes: service.petSittingPolicy.acceptedDogSizes,
      acceptedCatSizes: service.petSittingPolicy.acceptedCatSizes,
      acceptedAgeGroups: service.petSittingPolicy.acceptedAgeGroups,
      acceptsSpecialNeedsPets: service.petSittingPolicy.acceptsSpecialNeedsPets,
      capabilities: service.petSittingPolicy.capabilities,
      maxDogsAtOnce: 1,
      homeConditions: [],
    }
  }
  if (service.boardingPolicy) {
    return {
      acceptedDogSizes: service.boardingPolicy.acceptedDogSizes,
      acceptedCatSizes: service.boardingPolicy.acceptedCatSizes,
      acceptedAgeGroups: service.boardingPolicy.acceptedAgeGroups,
      acceptsSpecialNeedsPets: service.boardingPolicy.acceptsSpecialNeedsPets,
      capabilities: service.boardingPolicy.capabilities,
      maxDogsAtOnce: 1,
      homeConditions: service.boardingPolicy.homeConditions,
    }
  }
  return EMPTY_POLICY
}

function tiersFromService(service: ServiceOffering): TierInput[] {
  return (service.tiers ?? []).map((t) => ({
    id: t.id,
    durationMinutes: t.durationMinutes,
    basePrice: Number(t.basePrice),
    priceUnit: t.priceUnit,
  }))
}

function surchargesFromService(service: ServiceOffering): SurchargeInput[] {
  return (service.sizeSurcharges ?? []).map((s) => ({
    petSpecies: s.petSpecies,
    size: s.size,
    surchargeAmount: Number(s.surchargeAmount),
  }))
}

function addonsFromService(service: ServiceOffering): AddonInput[] {
  return (service.addons ?? []).map((a) => ({
    name: a.name,
    description: a.description ?? '',
    price: Number(a.price),
    priceUnit: a.priceUnit,
  }))
}

export default function EditServiceModal(props: EditServiceModalProps) {
  const { open, onOpenChange, mode, onSaved } = props

  const availableTypes =
    mode === 'create'
      ? Object.values(ServiceType).filter(
          (t) => !props.existingServiceTypes.includes(t),
        )
      : []

  const initialServiceType: ServiceType | null =
    mode === 'edit' ? props.service.serviceType : (availableTypes[0] ?? null)

  const [serviceType, setServiceType] = useState<ServiceType | null>(
    initialServiceType,
  )
  const [description, setDescription] = useState('')
  const [tiers, setTiers] = useState<TierInput[]>([])
  const [surcharges, setSurcharges] = useState<SurchargeInput[]>([])
  const [addons, setAddons] = useState<AddonInput[]>([])
  const [policy, setPolicy] = useState<PolicyState>(EMPTY_POLICY)
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset / prehydrate on open
  useEffect(() => {
    if (!open) return
    setActiveTab('general')
    setError(null)
    if (mode === 'edit') {
      const s = props.service
      setServiceType(s.serviceType)
      setDescription(s.description ?? '')
      setTiers(tiersFromService(s))
      setSurcharges(surchargesFromService(s))
      setAddons(addonsFromService(s))
      setPolicy(policyFromService(s))
    } else {
      const firstAvailable = availableTypes[0] ?? null
      setServiceType(firstAvailable)
      setDescription('')
      setTiers(
        firstAvailable
          ? [
              {
                durationMinutes:
                  firstAvailable === ServiceType.WALKING ? 60 : null,
                basePrice: null,
                priceUnit: DEFAULT_PRICE_UNIT[firstAvailable],
              },
            ]
          : [],
      )
      setSurcharges([])
      setAddons([])
      setPolicy(EMPTY_POLICY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Type can change тільки при create; edit його лочить.
  function handleTypeChange(next: ServiceType) {
    setServiceType(next)
    setTiers([
      {
        durationMinutes: next === ServiceType.WALKING ? 60 : null,
        basePrice: null,
        priceUnit: DEFAULT_PRICE_UNIT[next],
      },
    ])
  }

  const validTiers = tiers.filter(
    (t) => t.basePrice !== null && t.basePrice > 0,
  )
  const isValid = serviceType !== null && validTiers.length > 0

  async function handleSave() {
    if (!serviceType || !isValid) return
    setBusy(true)
    setError(null)
    try {
      let saved: ServiceOffering
      if (mode === 'create') {
        const dto = buildCreateDto(
          serviceType,
          description,
          validTiers,
          surcharges,
          addons,
          policy,
        )
        saved = await serviceOfferingsService.create(dto)
      } else {
        const dto = buildUpdateDto(
          serviceType,
          description,
          validTiers,
          surcharges,
          addons,
          policy,
        )
        saved = await serviceOfferingsService.update(props.service.id, dto)
      }
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      const e = err as {
        response?: { status?: number; data?: { message?: string | string[] } }
      }
      const status = e.response?.status
      if (status === 409) {
        setError(
          'Не можна зберегти: тариф використовується в існуючому замовленні. Не видаляйте такі тарифи й лишайте їх ціну незмінною.',
        )
      } else {
        const message = e.response?.data?.message ?? null
        const flat = Array.isArray(message) ? message.join(', ') : message
        setError(flat ?? 'Не вдалося зберегти. Спробуйте ще раз.')
      }
    } finally {
      setBusy(false)
    }
  }

  const showsPolicyTab = serviceType !== null && POLICY_TYPES.includes(serviceType)
  const tabsToShow = TABS.filter((t) => t.id !== 'policy' || showsPolicyTab)

  const title = mode === 'create' ? 'Нова послуга' : 'Редагувати послугу'
  const submitLabel = mode === 'create' ? 'Створити' : 'Зберегти'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Налаштуйте тарифи, надбавки за розмір, додаткові послуги та правила
            прийому тваринок.
          </SheetDescription>
        </SheetHeader>

        {mode === 'create' && availableTypes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-6 py-8 text-center text-sm text-zinc-600">
            Ви вже додали послуги всіх типів. Щоб змінити існуючу — відкрийте
            її в списку.
          </div>
        ) : (
          <>
            <div className="px-6 pt-3 border-b border-zinc-200">
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

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {activeTab === 'general' && (
                <GeneralPane
                  mode={mode}
                  availableTypes={availableTypes}
                  serviceType={serviceType}
                  description={description}
                  onTypeChange={handleTypeChange}
                  onDescriptionChange={setDescription}
                />
              )}
              {activeTab === 'tiers' && serviceType && (
                <TiersPane
                  serviceType={serviceType}
                  tiers={tiers}
                  setTiers={setTiers}
                />
              )}
              {activeTab === 'sizes' && (
                <SizesPane
                  serviceType={serviceType}
                  surcharges={surcharges}
                  setSurcharges={setSurcharges}
                />
              )}
              {activeTab === 'addons' && (
                <AddonsPane addons={addons} setAddons={setAddons} />
              )}
              {activeTab === 'policy' && serviceType && showsPolicyTab && (
                <PolicyPane
                  serviceType={serviceType}
                  policy={policy}
                  setPolicy={setPolicy}
                />
              )}
              {error && (
                <p className="text-sm text-destructive mt-4">{error}</p>
              )}
            </div>

            <SheetFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Скасувати
              </Button>
              <Button onClick={handleSave} disabled={busy || !isValid}>
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  submitLabel
                )}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// DTO builders

function buildCreateDto(
  serviceType: ServiceType,
  description: string,
  validTiers: TierInput[],
  surcharges: SurchargeInput[],
  addons: AddonInput[],
  policy: PolicyState,
): CreateServiceOfferingDto {
  const dto: CreateServiceOfferingDto = {
    serviceType,
    description: description.trim() || undefined,
    tiers: validTiers.map((t) => ({
      durationMinutes: t.durationMinutes ?? undefined,
      basePrice: t.basePrice as number,
      priceUnit: t.priceUnit,
    })),
    sizeSurcharges:
      surcharges.length > 0
        ? surcharges.map((s) => ({
            petSpecies: s.petSpecies,
            size: s.size,
            surchargeAmount: s.surchargeAmount,
          }))
        : undefined,
    addons:
      addons.length > 0
        ? addons.map((a) => ({
            name: a.name.trim(),
            description: a.description.trim() || undefined,
            price: a.price,
            priceUnit: a.priceUnit,
          }))
        : undefined,
  }

  attachPolicy(dto, serviceType, policy)
  return dto
}

function buildUpdateDto(
  serviceType: ServiceType,
  description: string,
  validTiers: TierInput[],
  surcharges: SurchargeInput[],
  addons: AddonInput[],
  policy: PolicyState,
): UpdateServiceOfferingDto {
  const dto: UpdateServiceOfferingDto = {
    description: description.trim() || null,
    tiers: validTiers.map((t) => ({
      id: t.id,
      durationMinutes: t.durationMinutes ?? null,
      basePrice: t.basePrice as number,
      priceUnit: t.priceUnit,
    })),
    sizeSurcharges: surcharges.map((s) => ({
      petSpecies: s.petSpecies,
      size: s.size,
      surchargeAmount: s.surchargeAmount,
    })),
    addons: addons.map((a) => ({
      name: a.name.trim(),
      description: a.description.trim() || undefined,
      price: a.price,
      priceUnit: a.priceUnit,
    })),
  }

  attachPolicy(dto, serviceType, policy)
  return dto
}

function attachPolicy(
  dto: CreateServiceOfferingDto | UpdateServiceOfferingDto,
  serviceType: ServiceType,
  policy: PolicyState,
): void {
  const baseFields = {
    acceptedDogSizes:
      policy.acceptedDogSizes.length > 0
        ? policy.acceptedDogSizes
        : Object.values(DogSize),
    acceptedAgeGroups:
      policy.acceptedAgeGroups.length > 0
        ? policy.acceptedAgeGroups
        : Object.values(PetAgeGroup),
    acceptsSpecialNeedsPets: policy.acceptsSpecialNeedsPets,
    capabilities: policy.capabilities,
  }
  const catSizes =
    policy.acceptedCatSizes.length > 0
      ? policy.acceptedCatSizes
      : Object.values(CatSize)

  if (serviceType === ServiceType.WALKING) {
    dto.walkingPolicy = {
      ...baseFields,
      acceptedCatSizes: catSizes,
      maxDogsAtOnce: policy.maxDogsAtOnce,
    }
  } else if (serviceType === ServiceType.PET_SITTING) {
    dto.petSittingPolicy = { ...baseFields, acceptedCatSizes: catSizes }
  } else if (serviceType === ServiceType.BOARDING) {
    dto.boardingPolicy = {
      ...baseFields,
      acceptedCatSizes: catSizes,
      homeConditions: policy.homeConditions,
    }
  }
}

// ---------------------------------------------------------------------------
// Tab panes

interface GeneralPaneProps {
  mode: 'create' | 'edit'
  availableTypes: ServiceType[]
  serviceType: ServiceType | null
  description: string
  onTypeChange: (t: ServiceType) => void
  onDescriptionChange: (v: string) => void
}

function GeneralPane({
  mode,
  availableTypes,
  serviceType,
  description,
  onTypeChange,
  onDescriptionChange,
}: GeneralPaneProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="es-type">Тип послуги</Label>
        {mode === 'edit' ? (
          <Input
            id="es-type"
            value={serviceType ? SERVICE_TYPE_LABELS[serviceType] : ''}
            disabled
          />
        ) : (
          <Select
            value={serviceType ?? undefined}
            onValueChange={(v) => onTypeChange(v as ServiceType)}
          >
            <SelectTrigger id="es-type">
              <SelectValue placeholder="Оберіть тип" />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {SERVICE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-zinc-500">
          {mode === 'edit'
            ? 'Тип послуги змінити не можна.'
            : 'Тип не можна змінити після створення послуги.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="es-desc">Опис (опціонально)</Label>
        <Textarea
          id="es-desc"
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

  function update(idx: number, patch: Partial<TierInput>) {
    setTiers(tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }
  function add(durationMinutes: number | null = null) {
    setTiers([
      ...tiers,
      {
        durationMinutes,
        basePrice: null,
        priceUnit: DEFAULT_PRICE_UNIT[serviceType],
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
        у вкладці «Розмір». Мінімум один тариф.
      </p>

      {showsDuration && templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {templates
            .filter(
              (tt) => !tiers.some((t) => t.durationMinutes === tt.minutes),
            )
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

      <div className="space-y-2">
        {tiers.map((t, idx) => (
          <div
            key={t.id ?? `new-${idx}`}
            className="flex items-center gap-2 rounded-md border border-zinc-200 p-2 bg-zinc-50"
          >
            {showsDuration ? (
              <div className="flex items-center gap-1 flex-1">
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
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => add()}>
          <Plus className="w-4 h-4 mr-1" />
          Додати тариф
        </Button>
      </div>
    </div>
  )
}

interface SizesPaneProps {
  serviceType: ServiceType | null
  surcharges: SurchargeInput[]
  setSurcharges: (next: SurchargeInput[]) => void
}

function SizesPane({ serviceType, surcharges, setSurcharges }: SizesPaneProps) {
  function get(species: 'DOG' | 'CAT', size: string): number | null {
    return (
      surcharges.find((s) => s.petSpecies === species && s.size === size)
        ?.surchargeAmount ?? null
    )
  }
  function set(species: 'DOG' | 'CAT', size: string, value: number | null) {
    const next = surcharges.filter(
      (s) => !(s.petSpecies === species && s.size === size),
    )
    if (value !== null && value !== 0) {
      next.push({ petSpecies: species, size, surchargeAmount: value })
    }
    setSurcharges(next)
  }

  if (!serviceType) return null

  const dogSizes = Object.values(DogSize)
  const catSizes = Object.values(CatSize)

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Скільки дорожче (або дешевше) для не-MEDIUM розмірів. MEDIUM завжди
        дорівнює базовій ціні (надбавка = 0). Залиште поле порожнім для
        розмірів без надбавки.
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

interface AddonsPaneProps {
  addons: AddonInput[]
  setAddons: (next: AddonInput[]) => void
}

function AddonsPane({ addons, setAddons }: AddonsPaneProps) {
  function update(idx: number, patch: Partial<AddonInput>) {
    setAddons(addons.map((a, i) => (i === idx ? { ...a, ...patch } : a)))
  }
  function add() {
    setAddons([
      ...addons,
      { name: '', description: '', price: 0, priceUnit: AddonPriceUnit.PER_BOOKING },
    ])
  }
  function remove(idx: number) {
    setAddons(addons.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Опційні платні екстри, які клієнт може обрати при бронюванні.
      </p>

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
  setPolicy: (
    updater: PolicyState | ((prev: PolicyState) => PolicyState),
  ) => void
}

function PolicyPane({ serviceType, policy, setPolicy }: PolicyPaneProps) {
  function patch<K extends keyof PolicyState>(key: K, value: PolicyState[K]) {
    setPolicy((prev) => ({ ...prev, [key]: value }))
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
          id="es-special"
          type="checkbox"
          checked={policy.acceptsSpecialNeedsPets}
          onChange={(e) => patch('acceptsSpecialNeedsPets', e.target.checked)}
          className="mt-1"
        />
        <div className="flex flex-col">
          <Label htmlFor="es-special" className="font-medium">
            Приймаю тваринок з особливими потребами
          </Label>
          <span className="text-xs text-zinc-500">
            Хронічні захворювання, обмеження мобільності тощо.
          </span>
        </div>
      </div>

      {serviceType === ServiceType.WALKING && (
        <div className="space-y-1.5">
          <Label htmlFor="es-max-dogs">Максимум тваринок одночасно</Label>
          <Input
            id="es-max-dogs"
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
