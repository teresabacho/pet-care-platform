import { useEffect } from 'react'
import { Trash2, Plus, Check, Circle } from 'lucide-react'
import {
  AddonPriceUnit,
  CatSize,
  DogSize,
  HomeCondition,
  PetAgeGroup,
  PriceUnit,
  ServiceType,
} from '@pet-care/shared'
import {
  useCaretakerOnboardingStore,
  EMPTY_SERVICE_FORM_DATA,
  type ServiceFormData,
  type PetSpecies,
} from '../../store/caretakerOnboardingStore'
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
  CAT_SIZE_LABELS,
  DOG_SIZE_LABELS,
  HOME_CONDITION_LABELS,
  PET_AGE_GROUP_LABELS,
  PRICE_UNIT_LABELS,
  SERVICE_TYPE_LABELS,
} from '../../lib/caretaker-labels'
import { ADDON_SUGGESTIONS, type AddonSuggestion } from '../../lib/addon-suggestions'
import {
  ALLOWED_SPECIES_FOR_SERVICE,
  DEFAULT_PRICE_UNIT,
  INCLUSION_TEMPLATES,
  SPECIES_LABELS,
  TIER_DURATION_TEMPLATES,
} from '../../lib/service-templates'
import ChipMultiSelect from './ChipMultiSelect'
import CollapsibleSection from './CollapsibleSection'
import { cn } from '@/lib/utils'

function showsDuration(unit: PriceUnit): boolean {
  return unit === PriceUnit.PER_SESSION || unit === PriceUnit.PER_HOUR
}

function isServiceComplete(data: ServiceFormData): boolean {
  return (
    data.tiers.length > 0 &&
    data.tiers.every(
      (t) =>
        t.basePrice !== null &&
        t.basePrice > 0 &&
        (!showsDuration(t.priceUnit) || (t.durationMinutes !== null && t.durationMinutes > 0)),
    )
  )
}

const DOG_SIZE_OPTIONS = Object.values(DogSize).map((v) => ({ value: v, label: DOG_SIZE_LABELS[v] }))
const CAT_SIZE_OPTIONS = Object.values(CatSize).map((v) => ({ value: v, label: CAT_SIZE_LABELS[v] }))
const AGE_OPTIONS = Object.values(PetAgeGroup).map((v) => ({ value: v, label: PET_AGE_GROUP_LABELS[v] }))
const HOME_CONDITION_OPTIONS = Object.values(HomeCondition).map((v) => ({
  value: v,
  label: HOME_CONDITION_LABELS[v],
}))

export default function Step3Services() {
  const { formData, nextStep, prevStep, toggleServiceType, setEditingServiceType, setServiceField } =
    useCaretakerOnboardingStore()
  const { selectedServiceTypes, editingServiceType, servicesData } = formData

  const editingData =
    (editingServiceType && servicesData[editingServiceType]) || EMPTY_SERVICE_FORM_DATA

  // Якщо обрано хоча б одну послугу але editingServiceType = null — встановлюємо першу.
  useEffect(() => {
    if (selectedServiceTypes.length > 0 && editingServiceType === null) {
      setEditingServiceType(selectedServiceTypes[0])
    }
  }, [selectedServiceTypes, editingServiceType, setEditingServiceType])

  // Auto-init tier-у при першому виборі типу послуги.
  // Для WALKING — дефолт 60 хв (бо це найпопулярніший варіант). Для інших типів —
  // null (бо PER_DAY) або null для гнучкості.
  useEffect(() => {
    if (
      editingServiceType &&
      servicesData[editingServiceType] &&
      servicesData[editingServiceType]!.tiers.length === 0
    ) {
      const defaultDuration =
        editingServiceType === ServiceType.WALKING ? 60 : null
      setServiceField(editingServiceType, 'tiers', [
        {
          durationMinutes: defaultDuration,
          basePrice: null,
          priceUnit: DEFAULT_PRICE_UNIT[editingServiceType],
        },
      ])
    }
  }, [editingServiceType, servicesData, setServiceField])

  const isValid =
    selectedServiceTypes.length > 0 &&
    selectedServiceTypes.every((t) => isServiceComplete(servicesData[t] ?? EMPTY_SERVICE_FORM_DATA))

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900">Послуги</h2>
        <p className="text-sm text-zinc-600">
          Оберіть усі типи послуг, які ви хочете надавати. Для кожної заповніть тарифи. Решту полів можна заповнити пізніше — вони підвищують довіру і ранжування.
        </p>
      </div>

      {/* Tile-multiselect для типів послуг */}
      <div className="space-y-2">
        <Label>Які послуги ви надаєте?</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.values(ServiceType).map((t) => {
            const selected = selectedServiceTypes.includes(t)
            const complete = selected && isServiceComplete(servicesData[t] ?? EMPTY_SERVICE_FORM_DATA)
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

      {/* Tabs з обраними послугами — клік перемикає editing */}
      {selectedServiceTypes.length > 0 && (
        <>
          {selectedServiceTypes.length > 1 && (
            <div className="flex flex-wrap gap-1 border-b border-zinc-200">
              {selectedServiceTypes.map((t) => {
                const complete = isServiceComplete(servicesData[t] ?? EMPTY_SERVICE_FORM_DATA)
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
                    {complete && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    {SERVICE_TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          )}

          {editingServiceType && (
            <ServiceFormPanel
              serviceType={editingServiceType}
              data={editingData}
              setField={(key, value) => setServiceField(editingServiceType, key, value)}
            />
          )}
        </>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={prevStep}>
          Назад
        </Button>
        <Button onClick={nextStep} disabled={!isValid} className="bg-zinc-900 hover:bg-zinc-800">
          Далі
        </Button>
      </div>
    </div>
  )
}

interface ServiceFormPanelProps {
  serviceType: ServiceType
  data: ServiceFormData
  setField: <K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) => void
}

function ServiceFormPanel({ serviceType, data, setField }: ServiceFormPanelProps) {
  const allowedSpecies = ALLOWED_SPECIES_FOR_SERVICE[serviceType]
  const acceptsDog = data.acceptedSpecies.includes('DOG')
  const acceptsCat = data.acceptedSpecies.includes('CAT')

  const priceUnit = data.tiers[0]?.priceUnit ?? DEFAULT_PRICE_UNIT[serviceType]

  const tierTemplates = TIER_DURATION_TEMPLATES[serviceType]
  const inclusionTemplates = INCLUSION_TEMPLATES[serviceType]
  const showsBoarding = serviceType === ServiceType.BOARDING
  const showsWalking = serviceType === ServiceType.WALKING

  // Ціни на addons-suggestions фільтруються за serviceType
  const addonSuggestions = ADDON_SUGGESTIONS.filter(
    (s) => !s.serviceTypes || s.serviceTypes.includes(serviceType),
  )
  const addonNotYetAdded = addonSuggestions.filter(
    (s) => !data.addons.some((a) => a.name === s.name),
  )

  const updateTier = (idx: number, patch: Partial<typeof data.tiers[number]>) => {
    setField(
      'tiers',
      data.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    )
  }
  const addTier = (durationMinutes: number | null = null) => {
    setField('tiers', [
      ...data.tiers,
      { durationMinutes, basePrice: null, priceUnit: DEFAULT_PRICE_UNIT[serviceType] },
    ])
  }
  const removeTier = (idx: number) => {
    if (data.tiers.length <= 1) return
    setField('tiers', data.tiers.filter((_, i) => i !== idx))
  }

  const updateSurcharge = (
    species: 'DOG' | 'CAT',
    size: string,
    amount: number | null,
  ) => {
    const next = data.sizeSurcharges.filter(
      (s) => !(s.petSpecies === species && s.size === size),
    )
    if (amount !== null && amount !== 0) {
      next.push({ petSpecies: species, size, surchargeAmount: amount })
    }
    setField('sizeSurcharges', next)
  }
  const getSurcharge = (species: 'DOG' | 'CAT', size: string): number | null =>
    data.sizeSurcharges.find((s) => s.petSpecies === species && s.size === size)
      ?.surchargeAmount ?? null

  const addAddon = () => {
    setField('addons', [
      ...data.addons,
      { name: '', description: '', price: 0, priceUnit: AddonPriceUnit.PER_BOOKING },
    ])
  }
  const updateAddon = (idx: number, patch: Partial<typeof data.addons[number]>) => {
    setField(
      'addons',
      data.addons.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    )
  }
  const removeAddon = (idx: number) => {
    setField('addons', data.addons.filter((_, i) => i !== idx))
  }
  const addAddonFromSuggestion = (s: AddonSuggestion) => {
    if (data.addons.some((a) => a.name === s.name)) return
    setField('addons', [
      ...data.addons,
      {
        name: s.name,
        description: s.description,
        price: s.defaultPrice,
        priceUnit: s.defaultPriceUnit,
      },
    ])
  }

  const toggleInclusion = (item: string) => {
    if (data.inclusions.includes(item)) {
      setField('inclusions', data.inclusions.filter((i) => i !== item))
    } else {
      setField('inclusions', [...data.inclusions, item])
    }
  }
  const addCustomInclusion = (val: string) => {
    const trimmed = val.trim()
    if (!trimmed) return
    if (data.inclusions.includes(trimmed)) return
    setField('inclusions', [...data.inclusions, trimmed])
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500 font-medium">
        Налаштування: {SERVICE_TYPE_LABELS[serviceType]}
      </div>

      {/* Tiers */}
      <div className="space-y-2">
        <Label>
          Варіанти тарифу
          <span className="ml-1 text-xs text-zinc-500 font-normal">
            ({PRICE_UNIT_LABELS[priceUnit]})
          </span>
        </Label>
        <p className="text-xs text-zinc-500">
          Можна додати кілька варіантів — клієнт обере один при бронюванні. Ціна — для тваринки середнього розміру (MEDIUM).
        </p>

        <div className="flex flex-wrap gap-2">
          {tierTemplates
            .filter((tt) => !data.tiers.some((t) => t.durationMinutes === tt.minutes))
            .map((tt) => (
              <button
                key={tt.label}
                type="button"
                onClick={() => addTier(tt.minutes)}
                className="px-3 py-1 rounded-full border border-zinc-300 text-xs text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50"
              >
                + {tt.label}
              </button>
            ))}
        </div>

        <div className="space-y-2">
          {data.tiers.map((t, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-md border border-zinc-200 p-2 bg-zinc-50"
            >
              {showsDuration(t.priceUnit) ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    min={1}
                    value={t.durationMinutes ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      updateTier(idx, { durationMinutes: v === '' ? null : Number(v) })
                    }}
                    placeholder="хв"
                    className="w-20"
                  />
                  <span className="text-xs text-zinc-500">хв</span>
                </div>
              ) : (
                <div className="flex-1 text-sm text-zinc-600">{PRICE_UNIT_LABELS[t.priceUnit]}</div>
              )}
              <Input
                type="number"
                min={0}
                value={t.basePrice ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  updateTier(idx, { basePrice: v === '' ? null : Number(v) })
                }}
                placeholder="200"
                className="w-24"
              />
              <span className="text-xs text-zinc-500">грн</span>
              {data.tiers.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeTier(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addTier()}>
            <Plus className="w-4 h-4 mr-1" />
            Додати свій варіант
          </Button>
        </div>
      </div>

      {/* Опис */}
      <div className="space-y-1.5">
        <Label htmlFor={`desc-${serviceType}`}>Опис послуги (опціонально)</Label>
        <Textarea
          id={`desc-${serviceType}`}
          value={data.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Що включає послуга, як проходить, особливості…"
          rows={3}
        />
      </div>

      {/* Що входить у вартість */}
      <CollapsibleSection
        title="Що входить у вартість"
        description="Чек-лист для клієнта — щоб одразу зрозумів, за що він платить"
      >
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Готові пункти (натисніть, щоб додати):</p>
          <div className="flex flex-wrap gap-2">
            {inclusionTemplates.map((item) => {
              const active = data.inclusions.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleInclusion(item)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-xs transition-colors',
                    active
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-500',
                  )}
                >
                  {item}
                </button>
              )
            })}
          </div>
        </div>
        <CustomInclusionInput onAdd={addCustomInclusion} />
        {data.inclusions.length > 0 && (
          <div className="rounded-md bg-zinc-50 border border-zinc-200 p-3">
            <p className="text-xs text-zinc-500 mb-1.5">Обрано:</p>
            <ul className="text-sm text-zinc-700 space-y-0.5 list-disc ml-4">
              {data.inclusions.map((i) => (
                <li key={i} className="flex items-start gap-2 -ml-4">
                  <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CollapsibleSection>

      {/* Кого приймаєте — спершу види */}
      <CollapsibleSection
        title="Кого ви приймаєте"
        description="Спершу види, потім розміри і вікові групи"
      >
        <div className="space-y-2">
          <Label>Види тваринок</Label>
          <ChipMultiSelect
            options={allowedSpecies.map((s) => ({ value: s, label: SPECIES_LABELS[s] }))}
            value={data.acceptedSpecies}
            onChange={(v) => setField('acceptedSpecies', v as PetSpecies[])}
          />
          {serviceType === ServiceType.WALKING && (
            <p className="text-xs text-zinc-500">Для вигулу доступні лише собаки і коти.</p>
          )}
        </div>

        {acceptsDog && (
          <div className="space-y-2">
            <Label>Розміри собак</Label>
            <ChipMultiSelect
              options={DOG_SIZE_OPTIONS}
              value={data.acceptedDogSizes}
              onChange={(v) => setField('acceptedDogSizes', v)}
            />
          </div>
        )}

        {acceptsCat && (
          <div className="space-y-2">
            <Label>Розміри котів</Label>
            <ChipMultiSelect
              options={CAT_SIZE_OPTIONS}
              value={data.acceptedCatSizes}
              onChange={(v) => setField('acceptedCatSizes', v)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Вікові групи</Label>
          <ChipMultiSelect
            options={AGE_OPTIONS}
            value={data.acceptedAgeGroups}
            onChange={(v) => setField('acceptedAgeGroups', v)}
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            id={`special-${serviceType}`}
            type="checkbox"
            checked={data.acceptsSpecialNeedsPets}
            onChange={(e) => setField('acceptsSpecialNeedsPets', e.target.checked)}
            className="mt-1"
          />
          <div className="flex flex-col">
            <Label htmlFor={`special-${serviceType}`} className="font-medium">
              Приймаю тваринок з особливими потребами
            </Label>
            <span className="text-xs text-zinc-500">
              Хронічні захворювання, обмеження мобільності тощо
            </span>
          </div>
        </div>

        {showsWalking && (
          <div className="space-y-1.5">
            <Label htmlFor={`maxPets-${serviceType}`}>Максимум тваринок одночасно</Label>
            <Input
              id={`maxPets-${serviceType}`}
              type="number"
              min={1}
              max={10}
              value={data.maxPetsAtOnce}
              onChange={(e) => setField('maxPetsAtOnce', Number(e.target.value) || 1)}
            />
          </div>
        )}
      </CollapsibleSection>

      {/* Розмір-надбавки */}
      {(acceptsDog || acceptsCat) && (
        <CollapsibleSection
          title="Надбавка за розмір"
          description="Скільки дорожче (або дешевше) для не-MEDIUM розмірів. MEDIUM = 0."
        >
          {acceptsDog && data.acceptedDogSizes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-zinc-500">Собаки</Label>
              {data.acceptedDogSizes.map((size) => {
                const isMedium = size === DogSize.MEDIUM
                return (
                  <div key={`dog-${size}`} className="flex items-center gap-3">
                    <span className="text-sm text-zinc-700 flex-1">{DOG_SIZE_LABELS[size]}</span>
                    <Input
                      type="number"
                      className="w-32"
                      disabled={isMedium}
                      value={isMedium ? 0 : (getSurcharge('DOG', size) ?? '')}
                      onChange={(e) =>
                        updateSurcharge(
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
          )}
          {acceptsCat && data.acceptedCatSizes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-zinc-500">Коти</Label>
              {data.acceptedCatSizes.map((size) => {
                const isMedium = size === CatSize.MEDIUM
                return (
                  <div key={`cat-${size}`} className="flex items-center gap-3">
                    <span className="text-sm text-zinc-700 flex-1">{CAT_SIZE_LABELS[size]}</span>
                    <Input
                      type="number"
                      className="w-32"
                      disabled={isMedium}
                      value={isMedium ? 0 : (getSurcharge('CAT', size) ?? '')}
                      onChange={(e) =>
                        updateSurcharge(
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
          )}
        </CollapsibleSection>
      )}

      {/* Addons */}
      <CollapsibleSection
        title="Додаткові послуги"
        description="Опційні платні екстри, які клієнт може обрати при замовленні"
      >
        {addonNotYetAdded.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Швидко додати з шаблонів:</p>
            <div className="flex flex-wrap gap-2">
              {addonNotYetAdded.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => addAddonFromSuggestion(s)}
                  className="px-3 py-1.5 rounded-full border border-zinc-300 bg-white text-xs text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50 transition-colors"
                >
                  + {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {data.addons.map((a, idx) => (
          <div
            key={idx}
            className="rounded-md border border-zinc-200 p-3 space-y-2 bg-zinc-50"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={a.name}
                  onChange={(e) => updateAddon(idx, { name: e.target.value })}
                  placeholder="Наприклад, помити лапи"
                />
                <Input
                  value={a.description}
                  onChange={(e) => updateAddon(idx, { description: e.target.value })}
                  placeholder="Опис (опц.)"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={a.price || ''}
                    onChange={(e) => updateAddon(idx, { price: Number(e.target.value) || 0 })}
                    placeholder="50"
                  />
                  <Select
                    value={a.priceUnit}
                    onValueChange={(v) => updateAddon(idx, { priceUnit: v as AddonPriceUnit })}
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
              <Button type="button" variant="ghost" size="sm" onClick={() => removeAddon(idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addAddon}>
          <Plus className="w-4 h-4 mr-1" />
          Додати власний
        </Button>
      </CollapsibleSection>

      {/* Boarding-only homeConditions */}
      {showsBoarding && (
        <CollapsibleSection
          title="Умови дому"
          description="Опишіть умови, в яких живуть тваринки. Несумісні пари виявить бекенд."
        >
          <ChipMultiSelect
            options={HOME_CONDITION_OPTIONS}
            value={data.homeConditions}
            onChange={(v) => setField('homeConditions', v)}
          />
        </CollapsibleSection>
      )}
    </div>
  )
}

interface CustomInclusionInputProps {
  onAdd: (val: string) => void
}
function CustomInclusionInput({ onAdd }: CustomInclusionInputProps) {
  return (
    <div className="flex gap-2">
      <Input
        placeholder="Свій пункт (напр. 'дзвінок власнику після прогулянки')"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const target = e.currentTarget
            onAdd(target.value)
            target.value = ''
          }
        }}
      />
    </div>
  )
}
