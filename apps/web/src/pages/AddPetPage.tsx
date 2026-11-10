import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  CalendarIcon,
  Check,
  ChevronLeft,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'
import { MediaOwnerType } from '@pet-care/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import BreedSelect from '../components/profile/BreedSelect'
import { PetGalleryEditor } from '../components/media'
import { DOG_BREEDS } from '../lib/dog-breeds'
import { CAT_BREEDS } from '../lib/cat-breeds'
import { petsService } from '../services/pets.service'
import { mediaService } from '../services/media.service'
import type {
  BehaviorAnswer,
  BehaviorRating,
  EnergyLevel,
  FeedingKind,
  MedicationKind,
  Pet,
  PetDetails,
  TimeAloneKind,
  ToiletFrequency,
} from '../types'

// ── Form data + constants ─────────────────────────────────────────────────

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Собака', emoji: '🐕' },
  { value: 'cat', label: 'Кіт', emoji: '🐈' },
  { value: 'bird', label: 'Птах', emoji: '🦜' },
  { value: 'rodent', label: 'Гризун', emoji: '🐹' },
  { value: 'other', label: 'Інша', emoji: '🐾' },
] as const

const BEHAVIOR_OPTIONS: { value: BehaviorRating; label: string }[] = [
  { value: 'good', label: 'Добре' },
  { value: 'bad', label: 'Погано' },
  { value: 'unknown', label: 'Не знаю' },
  { value: 'depends', label: 'Залежить' },
]

const TOILET_OPTIONS: { value: ToiletFrequency; label: string }[] = [
  { value: 'every_hour', label: 'Кожну годину' },
  { value: 'every_2h', label: 'Кожні 2 години' },
  { value: 'every_4h', label: 'Кожні 4 години' },
  { value: 'every_8h', label: 'Кожні 8 годин' },
  { value: 'special', label: 'Спеціальні інструкції' },
]

const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'high', label: 'Дуже енергійна' },
  { value: 'medium', label: 'Середня' },
  { value: 'low', label: 'Не енергійна' },
]

const FEEDING_OPTIONS: { value: FeedingKind; label: string }[] = [
  { value: 'morning', label: 'Раз на день, зранку' },
  { value: 'twice_daily', label: 'Двічі на день' },
  { value: 'special', label: 'Спеціальні інструкції' },
]

const TIME_ALONE_OPTIONS: { value: TimeAloneKind; label: string }[] = [
  { value: '1h_or_less', label: 'До 1 години' },
  { value: '1_to_4h', label: '1–4 години' },
  { value: '4_to_8h', label: '4–8 годин' },
  { value: 'special', label: 'Спеціальні інструкції' },
]

const MEDICATION_OPTIONS: { value: MedicationKind; label: string; placeholder: string }[] = [
  { value: 'pills', label: 'Таблетки', placeholder: 'Назва і дозування' },
  { value: 'injections', label: 'Ін’єкції', placeholder: 'Назва і періодичність' },
  { value: 'topical', label: 'Зовнішні засоби', placeholder: 'Назва (краплі, мазь…)' },
]

interface MedicationState {
  enabled: boolean
  name: string
}

interface DogFormState {
  name: string
  species: string
  breed: string // '' = untouched, 'mixed' = "Без породи", else breed name
  ageYears: string
  ageMonths: string
  weight: string
  sex: 'male' | 'female' | ''
  neutered: 'yes' | 'no' | 'unknown' | ''
  withKids: BehaviorRating | ''
  withKidsNote: string
  withDogs: BehaviorRating | ''
  withDogsNote: string
  withCats: BehaviorRating | ''
  withCatsNote: string
  dateAcquired: string
  description: string
  toilet: ToiletFrequency | ''
  toiletNote: string
  energy: EnergyLevel | ''
  feeding: FeedingKind | ''
  feedingNote: string
  timeAlone: TimeAloneKind | ''
  timeAloneNote: string
  meds: Record<MedicationKind, MedicationState>
  careNotes: string
}

const EMPTY_FORM: DogFormState = {
  name: '',
  species: '',
  breed: '',
  ageYears: '',
  ageMonths: '',
  weight: '',
  sex: '',
  neutered: '',
  withKids: '',
  withKidsNote: '',
  withDogs: '',
  withDogsNote: '',
  withCats: '',
  withCatsNote: '',
  dateAcquired: '',
  description: '',
  toilet: '',
  toiletNote: '',
  energy: '',
  feeding: '',
  feedingNote: '',
  timeAlone: '',
  timeAloneNote: '',
  meds: {
    pills: { enabled: false, name: '' },
    injections: { enabled: false, name: '' },
    topical: { enabled: false, name: '' },
  },
  careNotes: '',
}

// ── Section completion logic ──────────────────────────────────────────────

type SectionId = 'basic' | 'pet-basic' | 'pet-details' | 'pet-care' | 'media'

const PET_SPECIES_WITH_FORM = new Set(['dog', 'cat'])

interface SectionConfig {
  id: SectionId
  label: string
  appliesTo: (form: DogFormState) => boolean
  filled: (form: DogFormState) => number
  total: number
}

interface MediaState {
  hasAvatar: boolean
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'basic',
    label: 'Основна інформація',
    appliesTo: () => true,
    filled: (f) => (f.name.trim() ? 1 : 0) + (f.species ? 1 : 0),
    total: 2,
  },
  {
    id: 'pet-basic',
    label: 'Про тваринку',
    appliesTo: (f) => PET_SPECIES_WITH_FORM.has(f.species),
    filled: (f) =>
      (f.breed ? 1 : 0) +
      (f.ageYears || f.ageMonths ? 1 : 0) +
      (f.weight ? 1 : 0) +
      (f.sex ? 1 : 0),
    total: 4,
  },
  {
    id: 'pet-details',
    label: 'Додаткові деталі',
    appliesTo: (f) => PET_SPECIES_WITH_FORM.has(f.species),
    filled: (f) =>
      (f.neutered ? 1 : 0) +
      (f.withKids ? 1 : 0) +
      (f.withDogs ? 1 : 0) +
      (f.withCats ? 1 : 0) +
      (f.dateAcquired ? 1 : 0) +
      (f.description.trim() ? 1 : 0),
    total: 6,
  },
  {
    id: 'pet-care',
    label: 'Догляд за тваринкою',
    appliesTo: (f) => PET_SPECIES_WITH_FORM.has(f.species),
    filled: (f) =>
      (f.toilet ? 1 : 0) +
      (f.energy ? 1 : 0) +
      (f.feeding ? 1 : 0) +
      (f.timeAlone ? 1 : 0) +
      (Object.values(f.meds).some((m) => m.enabled) ? 1 : 0) +
      (f.careNotes.trim() ? 1 : 0),
    total: 6,
  },
]

const MEDIA_SECTION: SectionConfig & { mediaFilled: (m: MediaState) => number } = {
  id: 'media',
  label: 'Фото та галерея',
  appliesTo: () => true,
  filled: () => 0,
  mediaFilled: (m) => (m.hasAvatar ? 1 : 0),
  total: 1,
}

// ── Page ──────────────────────────────────────────────────────────────────

function petToFormState(pet: Pet): DogFormState {
  const d = pet.details ?? {}
  const meds: DogFormState['meds'] = {
    pills: { enabled: false, name: '' },
    injections: { enabled: false, name: '' },
    topical: { enabled: false, name: '' },
  }
  for (const m of d.medications ?? []) {
    meds[m.kind] = { enabled: true, name: m.name }
  }
  return {
    name: pet.name ?? '',
    species: pet.species ?? '',
    breed: pet.breed ?? '',
    ageYears: pet.age != null ? String(pet.age) : '',
    ageMonths: pet.ageMonths != null ? String(pet.ageMonths) : '',
    weight: pet.weight ?? '',
    sex: (pet.sex as DogFormState['sex']) ?? '',
    neutered: (pet.neutered as DogFormState['neutered']) ?? '',
    withKids: (d.behaviorWithKids?.rating as BehaviorRating) ?? '',
    withKidsNote: d.behaviorWithKids?.note ?? '',
    withDogs: (d.behaviorWithDogs?.rating as BehaviorRating) ?? '',
    withDogsNote: d.behaviorWithDogs?.note ?? '',
    withCats: (d.behaviorWithCats?.rating as BehaviorRating) ?? '',
    withCatsNote: d.behaviorWithCats?.note ?? '',
    dateAcquired: pet.dateAcquired ?? '',
    description: pet.description ?? '',
    toilet: (d.toiletFrequency?.kind as ToiletFrequency) ?? '',
    toiletNote: d.toiletFrequency?.note ?? '',
    energy: (d.energyLevel as EnergyLevel) ?? '',
    feeding: (d.feedingSchedule?.kind as FeedingKind) ?? '',
    feedingNote: d.feedingSchedule?.note ?? '',
    timeAlone: (d.timeAlone?.kind as TimeAloneKind) ?? '',
    timeAloneNote: d.timeAlone?.note ?? '',
    meds,
    careNotes: d.careNotes ?? '',
  }
}

export default function AddPetPage() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const isEditing = !!editId
  const [form, setForm] = useState<DogFormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(isEditing)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Avatar state ──────────────────────────────────────────────────────
  // photoUrl: серверна URL поточного аватара (null на створенні)
  // stagedAvatar: File у пам'яті, чекає upload після того як тваринку створили
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [stagedAvatar, setStagedAvatar] = useState<File | null>(null)
  const [stagedPreview, setStagedPreview] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [showDeleteAvatar, setShowDeleteAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!editId) return
    setLoading(true)
    petsService
      .getById(editId)
      .then((pet) => {
        setForm(petToFormState(pet))
        setPhotoUrl(pet.photoUrl ?? null)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [editId])

  // Очистити objectURL коли staged-файл змінюється або компонент unmount-иться
  useEffect(() => {
    if (!stagedPreview) return
    return () => URL.revokeObjectURL(stagedPreview)
  }, [stagedPreview])

  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    basic: null,
    'pet-basic': null,
    'pet-details': null,
    'pet-care': null,
    media: null,
  })

  const setSectionRef = (id: SectionId) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el
  }

  function patch<K extends keyof DogFormState>(key: K, value: DogFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function patchMed(kind: MedicationKind, partial: Partial<MedicationState>) {
    setForm((prev) => ({
      ...prev,
      meds: { ...prev.meds, [kind]: { ...prev.meds[kind], ...partial } },
    }))
  }

  function clearMed(kind: MedicationKind) {
    setForm((prev) => ({
      ...prev,
      meds: { ...prev.meds, [kind]: { enabled: false, name: '' } },
    }))
  }

  function scrollToSection(id: SectionId) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const visibleSections = useMemo(() => SECTIONS.filter((s) => s.appliesTo(form)), [form])

  const hasAvatar = !!photoUrl || !!stagedAvatar
  const mediaFilled = MEDIA_SECTION.mediaFilled({ hasAvatar })

  const overall = useMemo(() => {
    const totalFilled =
      visibleSections.reduce((s, sec) => s + sec.filled(form), 0) + mediaFilled
    const totalAll =
      visibleSections.reduce((s, sec) => s + sec.total, 0) + MEDIA_SECTION.total
    return totalAll > 0 ? Math.round((totalFilled / totalAll) * 100) : 0
  }, [form, visibleSections, mediaFilled])

  // ── Avatar handlers ───────────────────────────────────────────────────

  async function handleAvatarFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError('Фото завелике (ліміт 5 МБ)')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Підтримуються лише JPG, PNG, WebP')
      return
    }
    setError(null)

    if (!isEditing) {
      // Staged: завантажимо після створення тваринки
      setStagedAvatar(file)
      setStagedPreview(URL.createObjectURL(file))
      return
    }

    // Edit mode — upload одразу
    if (!editId) return
    setAvatarBusy(true)
    try {
      const item = await mediaService.uploadImage(
        file,
        MediaOwnerType.PET_AVATAR,
        editId,
      )
      setPhotoUrl(item.url)
    } catch {
      setError('Не вдалося завантажити фото')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function confirmDeleteAvatar() {
    if (isEditing && editId) {
      setAvatarBusy(true)
      try {
        await mediaService.deletePetAvatar(editId)
        setPhotoUrl(null)
      } catch {
        setError('Не вдалося видалити фото')
      } finally {
        setAvatarBusy(false)
      }
    } else {
      setStagedAvatar(null)
      setStagedPreview(null)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Введіть кличку')
      scrollToSection('basic')
      return
    }
    if (!form.species) {
      setError('Виберіть вид тваринки')
      scrollToSection('basic')
      return
    }

    setSubmitting(true)
    setError(null)

    const buildBehavior = (
      rating: BehaviorRating | '',
      note: string,
    ): BehaviorAnswer | undefined =>
      rating
        ? { rating, note: rating === 'depends' ? note.trim() || undefined : undefined }
        : undefined

    const meds = (Object.entries(form.meds) as [MedicationKind, MedicationState][])
      .filter(([, m]) => m.enabled && m.name.trim())
      .map(([kind, m]) => ({ kind, name: m.name.trim() }))

    const details: PetDetails = {
      behaviorWithKids: buildBehavior(form.withKids, form.withKidsNote),
      behaviorWithDogs: buildBehavior(form.withDogs, form.withDogsNote),
      behaviorWithCats: buildBehavior(form.withCats, form.withCatsNote),
      toiletFrequency: form.toilet
        ? {
            kind: form.toilet,
            note: form.toilet === 'special' ? form.toiletNote.trim() || undefined : undefined,
          }
        : undefined,
      energyLevel: form.energy || undefined,
      feedingSchedule: form.feeding
        ? {
            kind: form.feeding,
            note: form.feeding === 'special' ? form.feedingNote.trim() || undefined : undefined,
          }
        : undefined,
      timeAlone: form.timeAlone
        ? {
            kind: form.timeAlone,
            note:
              form.timeAlone === 'special' ? form.timeAloneNote.trim() || undefined : undefined,
          }
        : undefined,
      medications: meds.length > 0 ? meds : undefined,
      careNotes: form.careNotes.trim() || undefined,
    }

    const dto = {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed || undefined,
      age: form.ageYears ? Number(form.ageYears) : undefined,
      ageMonths: form.ageMonths ? Number(form.ageMonths) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      sex: form.sex || undefined,
      neutered: form.neutered || undefined,
      dateAcquired: form.dateAcquired || undefined,
      description: form.description.trim() || undefined,
      details,
    }

    try {
      if (isEditing && editId) {
        await petsService.update(editId, dto)
        navigate(`/pets/${editId}`)
      } else {
        const created = await petsService.create(dto)
        // Якщо є staged-фото — завантажуємо для щойно створеної тваринки.
        // Помилка тут не блокує — користувач опиниться на сторінці тваринки
        // і зможе додати фото з режиму редагування.
        if (stagedAvatar) {
          try {
            await mediaService.uploadImage(
              stagedAvatar,
              MediaOwnerType.PET_AVATAR,
              created.id,
            )
          } catch {
            // ignore — pet створена, фото можна додати пізніше
          }
        }
        navigate(redirectTo ?? `/pets/${created.id}`)
      }
    } catch {
      setError('Не вдалося зберегти. Перевірте дані та спробуйте знову.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-3">Тваринку не знайдено</p>
        <Link to="/pets" className="text-foreground underline">
          ← Повернутись до списку
        </Link>
      </div>
    )
  }

  const backHref = isEditing && editId ? `/pets/${editId}` : '/profile'
  const backLabel = isEditing ? 'До тваринки' : 'До профілю'
  const pageTitle = isEditing ? 'Редагувати тваринку' : 'Додати тваринку'
  const submitLabel = isEditing ? 'Зберегти зміни' : 'Додати тваринку'

  return (
    <div className="bg-zinc-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground self-start"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {backLabel}
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sticky side nav */}
          <aside className="lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                    Прогрес
                  </span>
                  <span className="font-medium text-foreground tabular-nums">{overall}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 transition-all duration-300"
                    style={{ width: `${overall}%` }}
                  />
                </div>
              </div>

              <nav className="flex flex-col gap-1">
                {visibleSections.map((sec) => {
                  const filled = sec.filled(form)
                  const total = sec.total
                  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className="group flex items-start gap-3 p-2.5 rounded-md text-left hover:bg-zinc-100 transition"
                    >
                      <ProgressCircle pct={pct} />
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground leading-tight">
                          {sec.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {filled} з {total} полів
                        </span>
                      </div>
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => scrollToSection('media')}
                  className="group flex items-start gap-3 p-2.5 rounded-md text-left hover:bg-zinc-100 transition"
                >
                  <ProgressCircle pct={mediaFilled * 100} />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground leading-tight">
                      Фото та галерея
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {hasAvatar ? 'Аватар додано' : 'Не додано'}
                    </span>
                  </div>
                </button>
              </nav>
            </div>
          </aside>

          {/* Centered form */}
          <main className="flex-1 max-w-2xl">
            <Card>
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="flex flex-col">
                  <div className="p-6 border-b border-border">
                    <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Заповніть якомога більше деталей — це допоможе доглядальнику краще
                      підготуватися.
                    </p>
                  </div>

                  <div className="flex flex-col gap-6 p-6">
                    {/* Section: Basic */}
                    <section
                      ref={setSectionRef('basic')}
                      className="flex flex-col gap-4 scroll-mt-20"
                    >
                      <SectionHeading>Основна інформація</SectionHeading>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="petName">Кличка *</Label>
                        <ClearableInput
                          id="petName"
                          value={form.name}
                          onChange={(v) => patch('name', v)}
                          placeholder="Барсік"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label>Вид тваринки *</Label>
                        <Select value={form.species} onValueChange={(v) => patch('species', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Виберіть вид" />
                          </SelectTrigger>
                          <SelectContent>
                            {SPECIES_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <span className="flex items-center gap-2">
                                  <span>{s.emoji}</span>
                                  <span>{s.label}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </section>

                    {PET_SPECIES_WITH_FORM.has(form.species) && (
                      <>
                        <Separator />

                        {/* Section: Pet basic */}
                        <section
                          ref={setSectionRef('pet-basic')}
                          className="flex flex-col gap-4 scroll-mt-20"
                        >
                          <SectionHeading>
                            {form.species === 'cat' ? 'Про кота' : 'Про собаку'}
                          </SectionHeading>

                          <div className="flex flex-col gap-1.5">
                            <Label>Порода</Label>
                            <BreedSelect
                              value={form.breed}
                              onChange={(v) => patch('breed', v)}
                              breeds={form.species === 'cat' ? CAT_BREEDS : DOG_BREEDS}
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label>Вік</Label>
                            <div className="flex gap-2">
                              <ClearableInput
                                type="number"
                                min={0}
                                max={30}
                                value={form.ageYears}
                                onChange={(v) => patch('ageYears', v)}
                                placeholder="Років"
                              />
                              <ClearableInput
                                type="number"
                                min={0}
                                max={11}
                                value={form.ageMonths}
                                onChange={(v) => patch('ageMonths', v)}
                                placeholder="Місяців"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="weight">Вага (кг)</Label>
                            <ClearableInput
                              id="weight"
                              type="number"
                              min={0}
                              step={0.1}
                              value={form.weight}
                              onChange={(v) => patch('weight', v)}
                              className="max-w-[200px]"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <FieldHeader
                              label="Стать"
                              showClear={!!form.sex}
                              onClear={() => patch('sex', '')}
                            />
                            <RadioGroup
                              value={form.sex}
                              onChange={(v) => patch('sex', v as DogFormState['sex'])}
                              options={[
                                { value: 'male', label: '♂ Хлопчик' },
                                { value: 'female', label: '♀ Дівчинка' },
                              ]}
                            />
                          </div>
                        </section>

                        <Separator />

                        {/* Section: Pet details */}
                        <section
                          ref={setSectionRef('pet-details')}
                          className="flex flex-col gap-4 scroll-mt-20"
                        >
                          <SectionHeading>Додаткові деталі</SectionHeading>

                          <div className="flex flex-col gap-1.5">
                            <FieldHeader
                              label="Стерилізація / кастрація"
                              showClear={!!form.neutered}
                              onClear={() => patch('neutered', '')}
                            />
                            <RadioGroup
                              value={form.neutered}
                              onChange={(v) => patch('neutered', v as DogFormState['neutered'])}
                              options={[
                                { value: 'yes', label: 'Так' },
                                { value: 'no', label: 'Ні' },
                                { value: 'unknown', label: 'Не знаю' },
                              ]}
                            />
                          </div>

                          <BehaviorBlock
                            label="Як поводить себе з дітьми"
                            value={form.withKids}
                            note={form.withKidsNote}
                            onChange={(v) => patch('withKids', v)}
                            onNoteChange={(v) => patch('withKidsNote', v)}
                            onClear={() => {
                              patch('withKids', '')
                              patch('withKidsNote', '')
                            }}
                          />
                          <BehaviorBlock
                            label={
                              form.species === 'cat'
                                ? 'Як поводить себе з собаками'
                                : 'Як поводить себе з іншими собаками'
                            }
                            value={form.withDogs}
                            note={form.withDogsNote}
                            onChange={(v) => patch('withDogs', v)}
                            onNoteChange={(v) => patch('withDogsNote', v)}
                            onClear={() => {
                              patch('withDogs', '')
                              patch('withDogsNote', '')
                            }}
                          />
                          <BehaviorBlock
                            label={
                              form.species === 'cat'
                                ? 'Як поводить себе з іншими котами'
                                : 'Як поводить себе з котами'
                            }
                            value={form.withCats}
                            note={form.withCatsNote}
                            onChange={(v) => patch('withCats', v)}
                            onNoteChange={(v) => patch('withCatsNote', v)}
                            onClear={() => {
                              patch('withCats', '')
                              patch('withCatsNote', '')
                            }}
                          />

                          <div className="flex flex-col gap-1.5">
                            <Label>Дата появи в родині</Label>
                            <DatePicker
                              value={form.dateAcquired}
                              onChange={(v) => patch('dateAcquired', v)}
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="description">Опис</Label>
                            <ClearableTextarea
                              id="description"
                              rows={3}
                              value={form.description}
                              onChange={(v) => patch('description', v)}
                              placeholder="Розкажіть про характер, звички, улюблені іграшки…"
                            />
                          </div>
                        </section>

                        <Separator />

                        {/* Section: Pet care */}
                        <section
                          ref={setSectionRef('pet-care')}
                          className="flex flex-col gap-4 scroll-mt-20"
                        >
                          <SectionHeading>Догляд за тваринкою</SectionHeading>

                          <ChoiceWithSpecial
                            label="Як часто треба в туалет"
                            value={form.toilet}
                            note={form.toiletNote}
                            options={TOILET_OPTIONS}
                            specialKey="special"
                            onChange={(v) => patch('toilet', v as DogFormState['toilet'])}
                            onNoteChange={(v) => patch('toiletNote', v)}
                            onClear={() => {
                              patch('toilet', '')
                              patch('toiletNote', '')
                            }}
                          />

                          <div className="flex flex-col gap-1.5">
                            <FieldHeader
                              label="Рівень енергії"
                              showClear={!!form.energy}
                              onClear={() => patch('energy', '')}
                            />
                            <RadioGroup
                              value={form.energy}
                              onChange={(v) => patch('energy', v as DogFormState['energy'])}
                              options={ENERGY_OPTIONS}
                            />
                          </div>

                          <ChoiceWithSpecial
                            label="Розклад харчування"
                            value={form.feeding}
                            note={form.feedingNote}
                            options={FEEDING_OPTIONS}
                            specialKey="special"
                            onChange={(v) => patch('feeding', v as DogFormState['feeding'])}
                            onNoteChange={(v) => patch('feedingNote', v)}
                            onClear={() => {
                              patch('feeding', '')
                              patch('feedingNote', '')
                            }}
                          />

                          <ChoiceWithSpecial
                            label="Скільки можна залишити саму"
                            value={form.timeAlone}
                            note={form.timeAloneNote}
                            options={TIME_ALONE_OPTIONS}
                            specialKey="special"
                            onChange={(v) => patch('timeAlone', v as DogFormState['timeAlone'])}
                            onNoteChange={(v) => patch('timeAloneNote', v)}
                            onClear={() => {
                              patch('timeAlone', '')
                              patch('timeAloneNote', '')
                            }}
                          />

                          <div className="flex flex-col gap-2">
                            <Label>Медикаменти</Label>
                            <div className="flex flex-col gap-2">
                              {MEDICATION_OPTIONS.map((med) => {
                                const state = form.meds[med.value]
                                return (
                                  <div key={med.value} className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={state.enabled}
                                          onChange={(e) =>
                                            patchMed(med.value, { enabled: e.target.checked })
                                          }
                                          className="h-4 w-4 rounded border-input"
                                        />
                                        <span className="text-sm">{med.label}</span>
                                      </label>
                                      {state.enabled && (
                                        <ClearLink onClear={() => clearMed(med.value)} />
                                      )}
                                    </div>
                                    {state.enabled && (
                                      <ClearableInput
                                        value={state.name}
                                        onChange={(v) => patchMed(med.value, { name: v })}
                                        placeholder={med.placeholder}
                                        className="ml-6 max-w-md"
                                      />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="careNotes">Додаткова інформація</Label>
                            <ClearableTextarea
                              id="careNotes"
                              rows={3}
                              value={form.careNotes}
                              onChange={(v) => patch('careNotes', v)}
                              placeholder="Все, що ще варто знати доглядальнику…"
                            />
                          </div>
                        </section>
                      </>
                    )}

                    {form.species && !PET_SPECIES_WITH_FORM.has(form.species) && (
                      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                        Детальна форма для цього виду в розробці. Поки що буде збережено лише
                        базову інформацію (кличка та вид).
                      </div>
                    )}

                    <Separator />

                    {/* Section: Media (avatar + gallery) */}
                    <section
                      ref={setSectionRef('media')}
                      className="flex flex-col gap-5 scroll-mt-20"
                    >
                      <SectionHeading>Фото та галерея</SectionHeading>

                      {/* Avatar */}
                      <div className="flex flex-col gap-3">
                        <Label>Фото профілю</Label>
                        <div className="flex items-center gap-4">
                          <Avatar className="w-20 h-20 border border-border">
                            {(stagedPreview || photoUrl) && (
                              <AvatarImage
                                src={stagedPreview ?? photoUrl ?? ''}
                                alt="фото"
                              />
                            )}
                            <AvatarFallback className="bg-zinc-100 text-zinc-400">
                              <ImagePlus className="w-7 h-7" />
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 flex flex-col gap-1.5">
                            <p className="text-xs text-muted-foreground">
                              JPG, PNG або WebP до 5 МБ. Будь-які пропорції — обрізаємо
                              до квадрата.
                            </p>
                            {!isEditing && stagedAvatar && (
                              <p className="text-xs text-muted-foreground">
                                Завантажиться, коли ви збережете тваринку.
                              </p>
                            )}
                          </div>

                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) void handleAvatarFile(f)
                              e.target.value = ''
                            }}
                          />

                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={avatarBusy || submitting}
                              onClick={() => avatarInputRef.current?.click()}
                            >
                              {avatarBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              {hasAvatar ? 'Замінити' : 'Завантажити'}
                            </Button>
                            {hasAvatar && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={avatarBusy || submitting}
                                onClick={() => setShowDeleteAvatar(true)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Видалити
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Gallery — only in edit mode */}
                      <div className="flex flex-col gap-2">
                        <Label>Галерея</Label>
                        {isEditing && editId ? (
                          <PetGalleryEditor petId={editId} maxItems={10} />
                        ) : (
                          <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground text-center">
                            Збережіть тваринку — і тут зʼявиться галерея до 10 фото
                            або відео.
                          </div>
                        )}
                      </div>
                    </section>

                    {error && (
                      <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                        {error}
                      </p>
                    )}
                  </div>

                  <div className="p-6 border-t border-border flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate(backHref)}
                      disabled={submitting}
                    >
                      Скасувати
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      {submitting ? 'Зберігаємо…' : submitLabel}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteAvatar}
        onOpenChange={setShowDeleteAvatar}
        title="Видалити фото профілю?"
        description="Поточне фото буде видалено. Цю дію не можна скасувати."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={confirmDeleteAvatar}
      />
    </div>
  )
}

// ── Progress circle (SVG) ─────────────────────────────────────────────────

function ProgressCircle({ pct, size = 24 }: { pct: number; size?: number }) {
  const stroke = 3
  const radius = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(100, Math.max(0, pct)) / 100)
  const isComplete = pct >= 100
  const isStarted = pct > 0

  return (
    <span className="relative shrink-0 mt-0.5" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={isComplete ? 'rgb(16 185 129)' : 'white'}
          stroke={isStarted ? 'rgb(228 228 231)' : 'rgb(212 212 216)'}
          strokeWidth={stroke}
        />
        {!isComplete && isStarted && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgb(24 24 27)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 300ms ease' }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {isComplete ? (
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        ) : (
          <span
            className={cn(
              'text-[9px] font-semibold tabular-nums leading-none',
              isStarted ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {pct}
          </span>
        )}
      </span>
    </span>
  )
}

// ── Date picker (shadcn Calendar in Popover) ──────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const date = value ? parseISO(value) : undefined

  function handleClear(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation()
    onChange('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex h-10 w-full max-w-[260px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        )}
      >
        <span className={cn('flex items-center gap-2', !date && 'text-muted-foreground')}>
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          {date ? format(date, 'd MMMM yyyy', { locale: uk }) : 'Виберіть дату'}
        </span>
        {date && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
            aria-label="Очистити"
            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) onChange(format(d, 'yyyy-MM-dd'))
            setOpen(false)
          }}
          locale={uk}
          disabled={{ after: new Date() }}
          captionLayout="dropdown"
          defaultMonth={date ?? new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}

// ── Clearable input / textarea wrappers ───────────────────────────────────

interface ClearableInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onChange: (v: string) => void
}

function ClearableInput({ value, onChange, className, ...props }: ClearableInputProps) {
  return (
    <div className={cn('relative w-full', !className?.includes('max-w') && 'w-full')}>
      <Input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(value ? 'pr-9' : '', className)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Очистити"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

interface ClearableTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string
  onChange: (v: string) => void
}

function ClearableTextarea({ value, onChange, className, ...props }: ClearableTextareaProps) {
  return (
    <div className="relative">
      <Textarea
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(value ? 'pr-9' : '', className)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Очистити"
          className="absolute right-2 top-2 p-0.5 rounded text-muted-foreground hover:text-foreground transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-foreground">{children}</h2>
}

function ClearLink({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
    >
      <X className="w-3 h-3" />
      Очистити
    </button>
  )
}

function FieldHeader({
  label,
  showClear,
  onClear,
}: {
  label: string
  showClear: boolean
  onClear: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      {showClear && <ClearLink onClear={onClear} />}
    </div>
  )
}

interface RadioOption<V extends string> {
  value: V
  label: string
}

interface RadioGroupProps<V extends string> {
  value: V | ''
  onChange: (v: V) => void
  options: RadioOption<V>[]
}

function RadioGroup<V extends string>({ value, onChange, options }: RadioGroupProps<V>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isOn = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'h-9 px-3.5 rounded-full text-sm font-medium border transition',
              isOn
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function BehaviorBlock({
  label,
  value,
  note,
  onChange,
  onNoteChange,
  onClear,
}: {
  label: string
  value: BehaviorRating | ''
  note: string
  onChange: (v: BehaviorRating) => void
  onNoteChange: (v: string) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldHeader label={label} showClear={!!value} onClear={onClear} />
      <RadioGroup value={value} onChange={onChange} options={BEHAVIOR_OPTIONS} />
      {value === 'depends' && (
        <ClearableInput
          value={note}
          onChange={onNoteChange}
          placeholder="Поясніть, від чого залежить"
        />
      )}
    </div>
  )
}

function ChoiceWithSpecial<V extends string>({
  label,
  value,
  note,
  options,
  specialKey,
  onChange,
  onNoteChange,
  onClear,
}: {
  label: string
  value: V | ''
  note: string
  options: { value: V; label: string }[]
  specialKey: V
  onChange: (v: V) => void
  onNoteChange: (v: string) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldHeader label={label} showClear={!!value} onClear={onClear} />
      <RadioGroup value={value} onChange={onChange} options={options} />
      {value === specialKey && (
        <ClearableTextarea
          rows={2}
          value={note}
          onChange={onNoteChange}
          placeholder="Опишіть деталі"
        />
      )}
    </div>
  )
}
