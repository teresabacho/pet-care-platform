import type {
  BehaviorRating,
  EnergyLevel,
  FeedingKind,
  MedicationKind,
  TimeAloneKind,
  ToiletFrequency,
} from '../types'

export const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕',
  cat: '🐈',
  rodent: '🐹',
  bird: '🦜',
  rabbit: '🐰',
  other: '🐾',
}

export const SPECIES_LABEL: Record<string, string> = {
  dog: 'Собака',
  cat: 'Кіт',
  rodent: 'Гризун',
  bird: 'Птах',
  other: 'Інша тваринка',
}

export const SEX_LABEL: Record<string, string> = {
  male: '♂ Хлопчик',
  female: '♀ Дівчинка',
}

export const NEUTERED_LABEL: Record<string, string> = {
  yes: 'Стерилізована',
  no: 'Не стерилізована',
  unknown: 'Невідомо',
}

export const BEHAVIOR_LABEL: Record<BehaviorRating, string> = {
  good: 'Добре',
  bad: 'Погано',
  unknown: 'Невідомо',
  depends: 'Залежить',
}

export const ENERGY_LABEL: Record<EnergyLevel, string> = {
  high: 'Дуже енергійна',
  medium: 'Середній рівень',
  low: 'Не енергійна',
}

export const TOILET_LABEL: Record<ToiletFrequency, string> = {
  every_hour: 'Кожну годину',
  every_2h: 'Кожні 2 години',
  every_4h: 'Кожні 4 години',
  every_8h: 'Кожні 8 годин',
  special: 'Спеціальні інструкції',
}

export const FEEDING_LABEL: Record<FeedingKind, string> = {
  morning: 'Раз на день, зранку',
  twice_daily: 'Двічі на день',
  special: 'Спеціальні інструкції',
}

export const TIME_ALONE_LABEL: Record<TimeAloneKind, string> = {
  '1h_or_less': 'До 1 години',
  '1_to_4h': '1–4 години',
  '4_to_8h': '4–8 годин',
  special: 'Спеціальні інструкції',
}

export const MEDICATION_LABEL: Record<MedicationKind, string> = {
  pills: 'Таблетки',
  injections: 'Ін’єкції',
  topical: 'Зовнішні засоби',
}

export function pluralizeYears(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'рік'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'роки'
  return 'років'
}

export function pluralizeMonths(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'місяць'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'місяці'
  return 'місяців'
}

export function formatAge(years: number | null, months: number | null): string | null {
  const parts: string[] = []
  if (years != null && years > 0) parts.push(`${years} ${pluralizeYears(years)}`)
  if (months != null && months > 0) parts.push(`${months} ${pluralizeMonths(months)}`)
  return parts.length > 0 ? parts.join(' ') : null
}

export function breedDisplay(breed: string | null): string | null {
  if (!breed) return null
  if (breed === 'mixed') return 'Без породи / метис'
  return breed
}
