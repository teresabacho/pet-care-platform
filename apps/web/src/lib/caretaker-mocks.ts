import {
  ADDON_TEMPLATES,
  AddonPriceUnit,
  EXPERIENCE_TEMPLATES,
  INCLUSION_TEMPLATES,
  ServiceType,
  SKILL_TAGS_LIBRARY,
} from '@pet-care/shared'
import { ADDON_PRICE_UNIT_LABELS } from './caretaker-labels'
import type { CaretakerProfile } from '../types'

export interface PriceVariant {
  label: string
  price: number
  unit: string
  hint?: string
}

export interface InfoCard {
  icon: string
  label: string
  value: string
}

export const TIME_SLOTS = [
  { label: '7–11', from: 7, to: 11 },
  { label: '11–15', from: 11, to: 15 },
  { label: '15–18', from: 15, to: 18 },
  { label: '18–23', from: 18, to: 23 },
] as const

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function derivePriceVariants(
  serviceType: ServiceType,
  basePrice: number,
): PriceVariant[] {
  const round = (n: number) => Math.round(n / 10) * 10

  switch (serviceType) {
    case ServiceType.WALKING:
      return [
        { label: '30 хвилин', price: round(basePrice * 0.6), unit: 'за прогулянку', hint: 'коротка прогулянка' },
        { label: '1 година', price: basePrice, unit: 'за прогулянку', hint: 'базовий варіант' },
        { label: '1.5 години', price: round(basePrice * 1.45), unit: 'за прогулянку' },
        { label: '2 години', price: round(basePrice * 1.85), unit: 'за прогулянку', hint: 'для активних порід' },
      ]
    case ServiceType.PET_SITTING:
      return [
        { label: '1 день', price: basePrice, unit: 'за день' },
        { label: 'Уїк-енд (2 дні)', price: round(basePrice * 1.95), unit: 'за період' },
        { label: 'Тиждень', price: round(basePrice * 6.5), unit: 'за період', hint: '−7% на тиждень' },
        { label: '2 тижні', price: round(basePrice * 12.5), unit: 'за період', hint: '−10% на 2 тижні' },
      ]
    case ServiceType.BOARDING:
      return [
        { label: '1 доба', price: basePrice, unit: 'за день' },
        { label: '3 доби', price: round(basePrice * 2.85), unit: 'за період' },
        { label: 'Тиждень', price: round(basePrice * 6.3), unit: 'за період', hint: '−10% на тиждень' },
        { label: '2 тижні', price: round(basePrice * 12), unit: 'за період', hint: '−15% на 2 тижні' },
      ]
    case ServiceType.GROOMING:
      return [
        { label: 'Базовий пакет', price: basePrice, unit: 'за сеанс', hint: 'миття + сушка + кігті' },
        { label: 'Стандарт', price: round(basePrice * 1.5), unit: 'за сеанс', hint: '+ стрижка під породу' },
        { label: 'Преміум', price: round(basePrice * 2), unit: 'за сеанс', hint: 'виставковий груминг' },
      ]
    case ServiceType.VET_VISIT:
      return [
        { label: 'Огляд вдома', price: basePrice, unit: 'за візит' },
        { label: 'Огляд + щеплення', price: round(basePrice * 1.4), unit: 'за візит' },
        { label: 'Виклик за місто', price: round(basePrice * 1.6), unit: 'за візит', hint: 'до 50 км' },
      ]
  }
}

export function generateAvailability(caretakerId: string, weekStart: Date): boolean[][] {
  const seed = hash(caretakerId + weekStart.toISOString().slice(0, 10))
  const result: boolean[][] = []
  for (let d = 0; d < 7; d++) {
    const row: boolean[] = []
    for (let s = 0; s < TIME_SLOTS.length; s++) {
      const r = pseudoRandom(seed + d * 7 + s * 13)
      const slotBias = s === 0 ? 0.55 : s === 3 ? 0.4 : 0.5
      row.push(r < slotBias)
    }
    result.push(row)
  }
  return result
}

export function getInfoCards(profile: CaretakerProfile): InfoCard[] {
  const responseHours = (hash(profile.id) % 3) + 1
  const completed = (hash(profile.id + 'b') % 200) + 50
  const langs = hash(profile.id + 'l') % 3 === 0 ? 'Укр, Англ' : 'Українська'

  return [
    {
      icon: '🎓',
      label: 'Досвід',
      value: profile.experienceYears != null ? `${profile.experienceYears} р.` : '—',
    },
    {
      icon: profile.isVerified ? '✓' : '◌',
      label: 'Статус',
      value: profile.isVerified ? 'Перевірено' : 'Без верифікації',
    },
    { icon: '💬', label: 'Мови', value: langs },
    {
      icon: '🚗',
      label: 'Радіус',
      value: profile.radiusKm != null ? `${profile.radiusKm} км` : '—',
    },
    { icon: '⏱️', label: 'Час відповіді', value: `< ${responseHours} год` },
    { icon: '📋', label: 'Виконано', value: `${completed} замовлень` },
  ]
}

export function getExperienceText(profile: CaretakerProfile, serviceType: ServiceType): string {
  const list = EXPERIENCE_TEMPLATES[serviceType]
  const idx = hash(profile.id + serviceType) % list.length
  return list[idx]
}

export function getSkills(profile: CaretakerProfile, serviceType: ServiceType): string[] {
  const all = SKILL_TAGS_LIBRARY[serviceType]
  const seed = hash(profile.id + serviceType + 'sk')
  const count = 3 + (seed % 3) // 3..5 skills
  const shuffled = [...all].sort((a, b) => {
    return (hash(a + seed) % 100) - (hash(b + seed) % 100)
  })
  return shuffled.slice(0, count)
}

// ── Pet acceptance (sizes, ages, special needs) ────────────────────────────

export type PetSpecies = 'dog' | 'cat'

export interface AcceptanceRow {
  key: string
  label: string
  detail?: string
  accepted: boolean
}

export interface PetAcceptanceColumn {
  species: PetSpecies
  sizes: AcceptanceRow[]
  ages: AcceptanceRow[]
  specialNeeds: boolean
}

const DOG_SIZES = [
  { key: 'small', label: 'Малі', detail: 'до 10 кг' },
  { key: 'medium', label: 'Середні', detail: '10–25 кг' },
  { key: 'large', label: 'Великі', detail: '25–45 кг' },
  { key: 'xlarge', label: 'Дуже великі', detail: '45+ кг' },
]
const CAT_SIZES = [
  { key: 'small', label: 'Малі', detail: 'до 4 кг' },
  { key: 'medium', label: 'Стандарт', detail: '4–6 кг' },
  { key: 'large', label: 'Великі', detail: '6+ кг' },
]
const DOG_AGES = [
  { key: 'puppy', label: 'Цуценята', detail: 'до 6 міс' },
  { key: 'young', label: 'Молоді', detail: '6 міс – 2 р' },
  { key: 'adult', label: 'Дорослі', detail: '2–7 р' },
  { key: 'senior', label: 'Старші', detail: '7–10 р' },
  { key: 'elderly', label: 'Похилого віку', detail: '10+ р' },
]
const CAT_AGES = [
  { key: 'kitten', label: 'Кошенята', detail: 'до 6 міс' },
  { key: 'young', label: 'Молоді', detail: '6 міс – 2 р' },
  { key: 'adult', label: 'Дорослі', detail: '2–7 р' },
  { key: 'senior', label: 'Старші', detail: '7–10 р' },
  { key: 'elderly', label: 'Похилого віку', detail: '10+ р' },
]

const SPECIES_BIAS: Record<ServiceType, Record<PetSpecies, number>> = {
  [ServiceType.WALKING]: { dog: 0.85, cat: 0.05 },
  [ServiceType.PET_SITTING]: { dog: 0.7, cat: 0.7 },
  [ServiceType.BOARDING]: { dog: 0.65, cat: 0.65 },
  [ServiceType.GROOMING]: { dog: 0.65, cat: 0.65 },
  [ServiceType.VET_VISIT]: { dog: 0.7, cat: 0.7 },
}

const STRICT_KEYS = new Set(['xlarge', 'elderly', 'puppy', 'kitten'])

function accepts(profile: CaretakerProfile, serviceType: ServiceType, species: PetSpecies, key: string): boolean {
  const baseBias = SPECIES_BIAS[serviceType][species]
  const threshold = STRICT_KEYS.has(key) ? baseBias * 0.5 : baseBias
  return pseudoRandom(hash(profile.id + serviceType + species + key)) < threshold
}

export function getPetAcceptance(
  profile: CaretakerProfile,
  serviceType: ServiceType,
): PetAcceptanceColumn[] {
  const speciesList: PetSpecies[] = ['dog', 'cat']
  return speciesList.map((species) => {
    const sizes = (species === 'dog' ? DOG_SIZES : CAT_SIZES).map((s) => ({
      ...s,
      accepted: accepts(profile, serviceType, species, `size:${s.key}`),
    }))
    const ages = (species === 'dog' ? DOG_AGES : CAT_AGES).map((a) => ({
      ...a,
      accepted: accepts(profile, serviceType, species, `age:${a.key}`),
    }))
    return {
      species,
      sizes,
      ages,
      specialNeeds: accepts(profile, serviceType, species, 'special'),
    }
  })
}

// ── Service conditions (тепер просто string-пункти з shared INCLUSION_TEMPLATES) ──

export function getServiceConditions(
  profile: CaretakerProfile,
  serviceType: ServiceType,
): string[] {
  const all = INCLUSION_TEMPLATES[serviceType]
  const seed = hash(profile.id + serviceType + 'cond')
  const count = 4 + (seed % 3) // 4..6
  const shuffled = [...all].sort(
    (a, b) => (hash(a + seed) % 100) - (hash(b + seed) % 100),
  )
  return shuffled.slice(0, count)
}

// ── Additional services (price-list extras) ────────────────────────────────

export interface AdditionalService {
  label: string
  hint?: string
  /** When `included: true`, price/unit ignored — UI shows "Включено". */
  included?: boolean
  price: number
  unit: string
}

function unitLabelForAddon(unit: AddonPriceUnit): string {
  return ADDON_PRICE_UNIT_LABELS[unit]
}

export function getAdditionalServices(
  profile: CaretakerProfile,
  serviceType: ServiceType,
): AdditionalService[] {
  const candidates = ADDON_TEMPLATES.filter(
    (t) => !t.serviceTypes || t.serviceTypes.includes(serviceType),
  )
  const seed = hash(profile.id + serviceType + 'addon')
  const count = 4 + (seed % 3) // 4..6
  const shuffled = [...candidates].sort(
    (a, b) => (hash(a.name + seed) % 100) - (hash(b.name + seed) % 100),
  )
  return shuffled.slice(0, count).map((t) => ({
    label: t.name,
    hint: t.description,
    price: t.defaultPrice,
    unit: unitLabelForAddon(t.defaultPriceUnit),
  }))
}
