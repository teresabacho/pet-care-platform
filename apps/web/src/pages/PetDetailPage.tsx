import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Weight,
  Heart,
  Pill,
  Phone,
  Mail,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useAuthStore } from '../store/authStore'
import { petsService } from '../services/pets.service'
import { usersService } from '../services/users.service'
import { MediaGallerySection } from '../components/media'
import { MediaOwnerType } from '@pet-care/shared'
import {
  BEHAVIOR_LABEL,
  ENERGY_LABEL,
  FEEDING_LABEL,
  MEDICATION_LABEL,
  NEUTERED_LABEL,
  SEX_LABEL,
  SPECIES_EMOJI,
  SPECIES_LABEL,
  TIME_ALONE_LABEL,
  TOILET_LABEL,
  breedDisplay,
  formatAge,
} from '../lib/pet-display'
import type { Pet, UserPublic } from '../types'

export default function PetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: authUser } = useAuthStore()

  const [pet, setPet] = useState<Pet | null>(null)
  const [owner, setOwner] = useState<UserPublic | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    setNotFound(false)
    petsService
      .getById(id)
      .then(async (petData) => {
        setPet(petData)
        // Fetch owner separately for "owner card".
        try {
          const ownerData = await usersService.getById(petData.ownerId)
          setOwner(ownerData)
        } catch {
          /* ignore — owner card simply won't render */
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false))
  }, [id])

  const isOwner = pet != null && authUser?.id === pet.ownerId

  async function handleDelete() {
    if (!pet) return
    await petsService.delete(pet.id)
    navigate('/pets')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    )
  }

  if (notFound || !pet) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-3">Тваринку не знайдено</p>
        <Link to="/pets" className="text-foreground underline">
          ← Повернутись до списку
        </Link>
      </div>
    )
  }

  const speciesKey = (pet.species ?? 'other').toLowerCase()
  const emoji = SPECIES_EMOJI[speciesKey] ?? '🐾'
  const ageStr = formatAge(pet.age, pet.ageMonths)
  const breedStr = breedDisplay(pet.breed)

  return (
    <div className="bg-zinc-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-[1400px] mx-auto px-4 py-6 flex flex-col gap-4">
        <Link
          to="/pets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground self-start"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          До списку тваринок
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6">
          {/* LEFT — sticky pet card */}
          <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <Card className="overflow-hidden">
              {/* Photo placeholder / actual photo */}
              <div className="aspect-square bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center text-7xl">
                {pet.photoUrl ? (
                  <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  emoji
                )}
              </div>

              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-semibold text-foreground leading-tight truncate">
                      {pet.name}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {SPECIES_LABEL[speciesKey] ?? 'Тваринка'}
                      {breedStr && <> · {breedStr}</>}
                    </p>
                  </div>
                </div>

                {/* Quick badges */}
                <div className="flex flex-wrap gap-1.5">
                  {ageStr && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <CalendarIcon className="w-3 h-3" />
                      {ageStr}
                    </Badge>
                  )}
                  {pet.weight != null && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Weight className="w-3 h-3" />
                      {pet.weight} кг
                    </Badge>
                  )}
                  {pet.sex && SEX_LABEL[pet.sex] && (
                    <Badge variant="secondary" className="font-normal">
                      {SEX_LABEL[pet.sex]}
                    </Badge>
                  )}
                  {pet.neutered === 'yes' && (
                    <Badge variant="secondary" className="font-normal">
                      Стерилізована
                    </Badge>
                  )}
                </div>

                {/* Owner card */}
                {owner && <OwnerCard owner={owner} />}

                {/* Action buttons (only if owner) */}
                {isOwner && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/pets/${pet.id}/edit`)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Редагувати
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — detailed info */}
          <div className="flex flex-col gap-6 min-w-0">
            <MediaGallerySection
              ownerType={MediaOwnerType.PET_GALLERY}
              ownerId={pet.id}
            />

            {pet.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Про {pet.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {pet.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {pet.dateAcquired && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">У родині з</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">
                    {format(parseISO(pet.dateAcquired), 'd MMMM yyyy', { locale: uk })}
                  </p>
                </CardContent>
              </Card>
            )}

            <BehaviorSection pet={pet} />

            <CareSection pet={pet} />

            <MedicationsSection pet={pet} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Видалити ${pet.name}?`}
        description="Ця дія незворотна. Уся інформація про тваринку, її історія догляду та інші пов’язані дані буде видалено назавжди."
        confirmLabel="Видалити"
        cancelLabel="Скасувати"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

// ── Owner card ────────────────────────────────────────────────────────────

function OwnerCard({ owner }: { owner: UserPublic }) {
  const fullName =
    owner.firstName || owner.lastName
      ? `${owner.firstName ?? ''} ${owner.lastName ? `${owner.lastName[0]}.` : ''}`.trim()
      : owner.email
  const initials = (
    (owner.firstName?.[0] ?? '') + (owner.lastName?.[0] ?? owner.email[0])
  ).toUpperCase()

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-border">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
        Власник
      </span>
      <Link
        to="/profile"
        className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-zinc-100 transition group"
      >
        <Avatar className="w-10 h-10 border border-border">
          {owner.avatarUrl && <AvatarImage src={owner.avatarUrl} alt={fullName} />}
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {owner.phone && (
              <span className="flex items-center gap-1 truncate">
                <Phone className="w-3 h-3 shrink-0" />
                {owner.phone}
              </span>
            )}
            {!owner.phone && owner.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 shrink-0" />
                {owner.email}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
      </Link>
    </div>
  )
}

// ── Behavior section ──────────────────────────────────────────────────────

function BehaviorSection({ pet }: { pet: Pet }) {
  const d = pet.details
  const hasAny =
    d?.behaviorWithKids || d?.behaviorWithDogs || d?.behaviorWithCats || pet.neutered

  if (!hasAny) return null

  const items: { label: string; rating?: string; note?: string; valueOverride?: string }[] = []

  if (pet.neutered) {
    items.push({
      label: 'Стерилізація / кастрація',
      valueOverride: NEUTERED_LABEL[pet.neutered] ?? pet.neutered,
    })
  }
  if (d?.behaviorWithKids) {
    items.push({
      label: 'З дітьми',
      rating: BEHAVIOR_LABEL[d.behaviorWithKids.rating],
      note: d.behaviorWithKids.note,
    })
  }
  if (d?.behaviorWithDogs) {
    items.push({
      label: 'З собаками',
      rating: BEHAVIOR_LABEL[d.behaviorWithDogs.rating],
      note: d.behaviorWithDogs.note,
    })
  }
  if (d?.behaviorWithCats) {
    items.push({
      label: 'З котами',
      rating: BEHAVIOR_LABEL[d.behaviorWithCats.rating],
      note: d.behaviorWithCats.note,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="w-4 h-4 text-rose-500" />
          Поведінка та особливості
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col divide-y divide-border">
          {items.map((it) => (
            <div key={it.label} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <dt className="text-sm text-muted-foreground">{it.label}</dt>
              <dd className="text-sm text-foreground text-right max-w-[60%]">
                {it.valueOverride ?? it.rating}
                {it.note && <span className="block text-xs text-muted-foreground mt-0.5">{it.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

// ── Care section ──────────────────────────────────────────────────────────

function CareSection({ pet }: { pet: Pet }) {
  const d = pet.details
  const hasAny =
    d?.toiletFrequency || d?.energyLevel || d?.feedingSchedule || d?.timeAlone || d?.careNotes

  if (!hasAny) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Догляд</CardTitle>
        <CardDescription>Режим, харчування, активність</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col divide-y divide-border">
          {d?.toiletFrequency && (
            <CareRow
              label="Туалет"
              value={TOILET_LABEL[d.toiletFrequency.kind]}
              note={d.toiletFrequency.note}
            />
          )}
          {d?.energyLevel && (
            <CareRow label="Рівень енергії" value={ENERGY_LABEL[d.energyLevel]} />
          )}
          {d?.feedingSchedule && (
            <CareRow
              label="Харчування"
              value={FEEDING_LABEL[d.feedingSchedule.kind]}
              note={d.feedingSchedule.note}
            />
          )}
          {d?.timeAlone && (
            <CareRow
              label="Час сам-удома"
              value={TIME_ALONE_LABEL[d.timeAlone.kind]}
              note={d.timeAlone.note}
            />
          )}
          {d?.careNotes && (
            <div className="py-2.5 first:pt-0 last:pb-0">
              <dt className="text-sm text-muted-foreground mb-1">Додаткова інформація</dt>
              <dd className="text-sm text-foreground whitespace-pre-line">{d.careNotes}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}

function CareRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground text-right max-w-[60%]">
        {value}
        {note && <span className="block text-xs text-muted-foreground mt-0.5">{note}</span>}
      </dd>
    </div>
  )
}

// ── Medications section ───────────────────────────────────────────────────

function MedicationsSection({ pet }: { pet: Pet }) {
  const meds = pet.details?.medications ?? []
  if (meds.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Pill className="w-4 h-4 text-amber-500" />
          Медикаменти
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {meds.map((m, idx) => (
            <li key={idx} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="text-sm text-muted-foreground shrink-0">
                {MEDICATION_LABEL[m.kind]}
              </span>
              <span className="text-sm text-foreground text-right max-w-[60%]">{m.name}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// Used internally — re-exported elsewhere later if needed.
export { OwnerCard }
