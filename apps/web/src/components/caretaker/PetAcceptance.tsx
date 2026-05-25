import { Check, X, HeartPulse } from 'lucide-react'
import {
  BirdType,
  CatSize,
  DogSize,
  OtherPetType,
  PetAgeGroup,
  RodentType,
  ServiceType,
} from '@pet-care/shared'
import { cn } from '@/lib/utils'
import {
  BIRD_TYPE_LABELS,
  CAT_SIZE_LABELS,
  DOG_SIZE_LABELS,
  OTHER_PET_TYPE_LABELS,
  PET_AGE_GROUP_LABELS,
  RODENT_TYPE_LABELS,
} from '@/lib/caretaker-labels'
import type { ServiceOffering } from '../../types'

const DOG_SIZE_ORDER: DogSize[] = [
  DogSize.MINI,
  DogSize.SMALL,
  DogSize.MEDIUM,
  DogSize.LARGE,
  DogSize.EXTRA_LARGE,
]
const CAT_SIZE_ORDER: CatSize[] = [CatSize.SMALL, CatSize.MEDIUM, CatSize.LARGE]
const AGE_ORDER: PetAgeGroup[] = [
  PetAgeGroup.PUPPY_OR_KITTEN,
  PetAgeGroup.YOUNG,
  PetAgeGroup.ADULT,
  PetAgeGroup.SENIOR,
  PetAgeGroup.ELDERLY,
]
const RODENT_ORDER: RodentType[] = [
  RodentType.HAMSTER,
  RodentType.GUINEA_PIG,
  RodentType.RAT,
  RodentType.MOUSE,
  RodentType.RABBIT,
  RodentType.FERRET,
  RodentType.CHINCHILLA,
]
const BIRD_ORDER: BirdType[] = [
  BirdType.PARROT,
  BirdType.BUDGERIGAR,
  BirdType.COCKATIEL,
  BirdType.CANARY,
  BirdType.FINCH,
  BirdType.OTHER_BIRD,
]
const OTHER_ORDER: OtherPetType[] = [
  OtherPetType.TURTLE,
  OtherPetType.FISH,
  OtherPetType.SNAKE,
  OtherPetType.LIZARD,
  OtherPetType.OTHER,
]

interface PetAcceptanceProps {
  offering: ServiceOffering
  className?: string
}

interface PolicyView {
  acceptedDogSizes: DogSize[]
  acceptedCatSizes: CatSize[]
  acceptedAgeGroups: PetAgeGroup[]
  acceptsSpecialNeedsPets: boolean
  acceptedRodentTypes?: RodentType[]
  acceptedBirdTypes?: BirdType[]
  acceptedOtherPetTypes?: OtherPetType[]
}

function pickPolicy(offering: ServiceOffering): PolicyView | null {
  if (offering.serviceType === ServiceType.WALKING && offering.walkingPolicy) {
    return offering.walkingPolicy
  }
  if (offering.serviceType === ServiceType.PET_SITTING && offering.petSittingPolicy) {
    return offering.petSittingPolicy
  }
  if (offering.serviceType === ServiceType.BOARDING && offering.boardingPolicy) {
    return offering.boardingPolicy
  }
  if (offering.serviceType === ServiceType.GROOMING && offering.groomingPolicy) {
    return offering.groomingPolicy
  }
  if (offering.serviceType === ServiceType.VET_VISIT && offering.vetVisitPolicy) {
    return offering.vetVisitPolicy
  }
  return null
}

interface Row {
  key: string
  label: string
  accepted: boolean
}

function AcceptanceList({ items, title }: { items: Row[]; title: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-zinc-500">
        {title}
      </span>
      <ul className="flex flex-col gap-0.5">
        {items.map((row) => (
          <li
            key={row.key}
            className={cn(
              'flex items-center gap-2 text-sm py-1',
              row.accepted
                ? 'text-zinc-900'
                : 'text-zinc-400 line-through decoration-zinc-300',
            )}
          >
            {row.accepted ? (
              <Check
                className="w-3.5 h-3.5 text-emerald-500 shrink-0"
                strokeWidth={3}
              />
            ) : (
              <X
                className="w-3.5 h-3.5 text-zinc-300 shrink-0"
                strokeWidth={3}
              />
            )}
            <span>{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SimpleSpeciesCard({
  emoji,
  title,
  rows,
}: {
  emoji: string
  title: string
  rows: Row[]
}) {
  const anyAccepted = rows.some((r) => r.accepted)
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">{emoji}</span>
        <span className="text-sm font-semibold text-zinc-900">{title}</span>
      </div>
      {!anyAccepted ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
          <X className="w-3.5 h-3.5 text-zinc-300" />
          Не приймаю
        </div>
      ) : (
        <AcceptanceList items={rows} title="Які саме" />
      )}
    </div>
  )
}

function FullSpeciesCard({
  species,
  sizes,
  ages,
  specialNeeds,
}: {
  species: 'dog' | 'cat'
  sizes: Row[]
  ages: Row[]
  specialNeeds: boolean
}) {
  const meta =
    species === 'dog'
      ? { emoji: '🐕', label: 'Собаки' }
      : { emoji: '🐈', label: 'Коти' }
  const anyAccepted =
    sizes.some((s) => s.accepted) || ages.some((a) => a.accepted) || specialNeeds

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">{meta.emoji}</span>
        <span className="text-sm font-semibold text-zinc-900">{meta.label}</span>
      </div>

      {!anyAccepted ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
          <X className="w-3.5 h-3.5 text-zinc-300" />
          Не приймаю {species === 'dog' ? 'собак' : 'котів'}
        </div>
      ) : (
        <>
          <AcceptanceList items={sizes} title="За розміром" />
          <AcceptanceList items={ages} title="За віком" />

          <div
            className={cn(
              'flex items-center gap-2 text-sm pt-2 border-t border-zinc-100',
              specialNeeds ? 'text-zinc-900' : 'text-zinc-400',
            )}
          >
            <HeartPulse
              className={cn(
                'w-3.5 h-3.5 shrink-0',
                specialNeeds ? 'text-rose-500' : 'text-zinc-300',
              )}
            />
            {specialNeeds
              ? 'Беру з особливими потребами'
              : 'Без особливих потреб'}
          </div>
        </>
      )}
    </div>
  )
}

export default function PetAcceptance({ offering, className }: PetAcceptanceProps) {
  const policy = pickPolicy(offering)

  if (!policy) {
    return (
      <section className={cn('flex flex-col gap-3', className)}>
        <h2 className="text-base font-semibold text-zinc-900">Кого приймаю</h2>
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 italic">
          [доробляється: для цього типу послуги поки немає політики прийому]
        </div>
      </section>
    )
  }

  const dogSizeRows: Row[] = DOG_SIZE_ORDER.map((s) => ({
    key: `dog-${s}`,
    label: DOG_SIZE_LABELS[s],
    accepted: policy.acceptedDogSizes.includes(s),
  }))
  const catSizeRows: Row[] = CAT_SIZE_ORDER.map((s) => ({
    key: `cat-${s}`,
    label: CAT_SIZE_LABELS[s],
    accepted: policy.acceptedCatSizes.includes(s),
  }))
  const ageRows: Row[] = AGE_ORDER.map((a) => ({
    key: `age-${a}`,
    label: PET_AGE_GROUP_LABELS[a],
    accepted: policy.acceptedAgeGroups.includes(a),
  }))

  const rodentRows: Row[] = RODENT_ORDER.map((r) => ({
    key: `rodent-${r}`,
    label: RODENT_TYPE_LABELS[r],
    accepted: policy.acceptedRodentTypes?.includes(r) ?? false,
  }))
  const birdRows: Row[] = BIRD_ORDER.map((b) => ({
    key: `bird-${b}`,
    label: BIRD_TYPE_LABELS[b],
    accepted: policy.acceptedBirdTypes?.includes(b) ?? false,
  }))
  const otherRows: Row[] = OTHER_ORDER.map((o) => ({
    key: `other-${o}`,
    label: OTHER_PET_TYPE_LABELS[o],
    accepted: policy.acceptedOtherPetTypes?.includes(o) ?? false,
  }))

  const hasMultiSpecies =
    policy.acceptedRodentTypes !== undefined ||
    policy.acceptedBirdTypes !== undefined ||
    policy.acceptedOtherPetTypes !== undefined

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="text-base font-semibold text-zinc-900">Кого приймаю</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FullSpeciesCard
          species="dog"
          sizes={dogSizeRows}
          ages={ageRows}
          specialNeeds={policy.acceptsSpecialNeedsPets}
        />
        <FullSpeciesCard
          species="cat"
          sizes={catSizeRows}
          ages={ageRows}
          specialNeeds={policy.acceptsSpecialNeedsPets}
        />
        {hasMultiSpecies && (
          <>
            <SimpleSpeciesCard emoji="🐹" title="Гризуни та кролі" rows={rodentRows} />
            <SimpleSpeciesCard emoji="🦜" title="Птахи" rows={birdRows} />
            <SimpleSpeciesCard emoji="🐢" title="Інші" rows={otherRows} />
          </>
        )}
      </div>
    </section>
  )
}
