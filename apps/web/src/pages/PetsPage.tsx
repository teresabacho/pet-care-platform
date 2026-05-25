import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar as CalendarIcon, ChevronRight, Loader2, Pencil, Plus, Trash2, Weight, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { petsService } from '../services/pets.service'
import {
  ENERGY_LABEL,
  SEX_LABEL,
  SPECIES_EMOJI,
  SPECIES_LABEL,
  breedDisplay,
  formatAge,
} from '../lib/pet-display'
import type { Pet } from '../types'

export default function PetsPage() {
  const navigate = useNavigate()
  const [pets, setPets] = useState<Pet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null)

  useEffect(() => {
    petsService
      .getMyPets()
      .then(setPets)
      .finally(() => setIsLoading(false))
  }, [])

  async function handleDelete() {
    if (!petToDelete) return
    await petsService.delete(petToDelete.id)
    setPets((prev) => prev.filter((p) => p.id !== petToDelete.id))
  }

  return (
    <div className="bg-zinc-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold text-foreground">Мої тваринки</h1>
            <p className="text-sm text-muted-foreground">
              Усі ваші улюбленці. Можна переглянути, редагувати чи видалити.
            </p>
          </div>
          <Button asChild>
            <Link to="/pets/new">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Додати тваринку
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : pets.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-3xl">
                🐾
              </div>
              <p className="text-sm text-muted-foreground">Ще не додано жодної тваринки</p>
              <Button asChild>
                <Link to="/pets/new">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Додати тваринку
                </Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {pets.map((pet) => (
              <PetRow
                key={pet.id}
                pet={pet}
                onView={() => navigate(`/pets/${pet.id}`)}
                onEdit={() => navigate(`/pets/${pet.id}/edit`)}
                onDelete={() => setPetToDelete(pet)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={petToDelete != null}
        onOpenChange={(open) => !open && setPetToDelete(null)}
        title={petToDelete ? `Видалити ${petToDelete.name}?` : 'Видалити тваринку?'}
        description="Ця дія незворотна. Уся інформація про тваринку буде видалена назавжди."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

interface PetRowProps {
  pet: Pet
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

function PetRow({ pet, onView, onEdit, onDelete }: PetRowProps) {
  const speciesKey = (pet.species ?? 'other').toLowerCase()
  const emoji = SPECIES_EMOJI[speciesKey] ?? '🐾'
  const ageStr = formatAge(pet.age, pet.ageMonths)
  const breedStr = breedDisplay(pet.breed)
  const energyLabel = pet.details?.energyLevel ? ENERGY_LABEL[pet.details.energyLevel] : null

  return (
    <Card
      onClick={onView}
      className={cn(
        'group p-4 flex items-stretch gap-4 cursor-pointer',
        'hover:shadow-md hover:border-zinc-300 transition',
      )}
    >
      {/* Avatar / photo placeholder */}
      <div className="shrink-0 w-20 h-20 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center text-3xl overflow-hidden">
        {pet.photoUrl ? (
          <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
        ) : (
          emoji
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="text-base font-semibold text-foreground truncate">{pet.name}</h3>
          <span className="text-xs text-muted-foreground shrink-0">
            {SPECIES_LABEL[speciesKey] ?? '—'}
          </span>
        </div>

        {breedStr && (
          <p className="text-xs text-muted-foreground truncate">{breedStr}</p>
        )}

        {/* Detail badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          {ageStr && (
            <Badge variant="secondary" className="font-normal gap-1">
              <CalendarIcon className="w-3 h-3" />
              {ageStr}
            </Badge>
          )}
          {pet.weight != null && (
            <Badge variant="secondary" className="font-normal gap-1">
              <Weight className="w-3 h-3" />
              {pet.weight} кг
            </Badge>
          )}
          {pet.sex && SEX_LABEL[pet.sex] && (
            <Badge variant="secondary" className="font-normal">
              {SEX_LABEL[pet.sex]}
            </Badge>
          )}
          {energyLabel && (
            <Badge variant="secondary" className="font-normal gap-1">
              <Zap className="w-3 h-3" />
              {energyLabel}
            </Badge>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end justify-between gap-2">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            aria-label="Редагувати"
            className="h-8 w-8 p-0"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label="Видалити"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
      </div>
    </Card>
  )
}
