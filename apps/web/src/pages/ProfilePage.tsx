import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  PawPrint,
  ChevronRight,
} from 'lucide-react'
import { Country, COUNTRY_LABELS } from '@pet-care/shared'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '../store/authStore'
import { usersService } from '../services/users.service'
import { petsService } from '../services/pets.service'
import type { Pet, UserPublic } from '../types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕',
  cat: '🐈',
  rodent: '🐹',
  bird: '🦜',
  rabbit: '🐰',
}

function pluralizePets(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'тваринка'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'тваринки'
  return 'тваринок'
}

function pluralizeYears(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'рік'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'роки'
  return 'років'
}

function formatDisplayName(user: UserPublic): string {
  const first = user.firstName ?? ''
  const lastInitial = user.lastName ? `${user.lastName[0]}.` : ''
  const composed = [first, lastInitial].filter(Boolean).join(' ').trim()
  return composed || user.email
}

function formatFullAddress(user: UserPublic | null): string | null {
  if (!user) return null
  const parts: string[] = []
  if (user.street) parts.push(user.street)
  if (user.apartment) parts.push(`кв. ${user.apartment}`)
  if (user.city) parts.push(user.city)
  if (user.country && user.country in COUNTRY_LABELS) {
    parts.push(COUNTRY_LABELS[user.country as Country])
  }
  return parts.length ? parts.join(', ') : null
}

function PetCard({ pet }: { pet: Pet }) {
  const speciesKey = (pet.species ?? '').toLowerCase()
  const emoji = SPECIES_EMOJI[speciesKey] ?? '🐾'
  const breedLabel = pet.breed === 'mixed' ? 'Без породи / метис' : pet.breed

  return (
    <Link
      to={`/pets/${pet.id}`}
      className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md hover:border-zinc-300 transition"
    >
      <div className="shrink-0 w-14 h-14 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center text-2xl">
        {pet.photoUrl ? (
          <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          emoji
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 truncate">{pet.name}</p>
        <p className="text-xs text-zinc-500 truncate">
          {[
            breedLabel,
            pet.age != null ? `${pet.age} ${pluralizeYears(pet.age)}` : null,
            pet.weight != null ? `${pet.weight} кг` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Без додаткових деталей'}
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
    </Link>
  )
}

export default function ProfilePage() {
  const { user: authUser } = useAuthStore()
  const [profile, setProfile] = useState<UserPublic | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authUser?.id) return
    Promise.all([usersService.getById(authUser.id), petsService.getMyPets()])
      .then(([userData, petsData]) => {
        setProfile(userData)
        setPets(petsData)
      })
      .finally(() => setIsLoading(false))
  }, [authUser?.id])

  const displayName = useMemo(() => (profile ? formatDisplayName(profile) : ''), [profile])
  const fullAddress = useMemo(() => formatFullAddress(profile), [profile])
  const initials = useMemo(() => {
    if (!profile) return '?'
    return (
      ((profile.firstName?.[0] ?? '') + (profile.lastName?.[0] ?? profile.email[0])).toUpperCase() ||
      '?'
    )
  }, [profile])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-400">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return <div className="text-center py-16 text-zinc-500">Профіль не знайдено</div>
  }

  return (
    <div className="bg-zinc-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Hero card */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 flex items-center gap-5 shadow-sm">
          <Avatar className="w-24 h-24 border border-zinc-200">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-zinc-100 text-zinc-700 text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-zinc-900 leading-tight truncate">
              {displayName}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {pets.length > 0
                ? `Власник ${pets.length} ${pluralizePets(pets.length)}`
                : 'Профіль власника'}
            </p>
          </div>

          <Link
            to="/profile/edit"
            className="shrink-0 flex items-center gap-1.5 h-10 px-4 text-sm font-medium text-zinc-900 border border-zinc-200 bg-white rounded-md hover:bg-zinc-50 transition"
          >
            <Pencil className="w-3.5 h-3.5" />
            Редагувати
          </Link>
        </div>

        {/* Contact info */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Контакти</h2>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-zinc-900">{profile.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
              {profile.phone ? (
                <span className="text-zinc-900">{profile.phone}</span>
              ) : (
                <span className="text-zinc-400 italic">Не вказано</span>
              )}
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Адреса</h2>

          {fullAddress ? (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="text-zinc-900">{fullAddress}</span>
                {(profile.floor || profile.entrance) && (
                  <span className="text-xs text-zinc-500">
                    {[
                      profile.entrance ? `під'їзд ${profile.entrance}` : null,
                      profile.floor ? `${profile.floor} поверх` : null,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="italic">Адресу ще не вказано</span>
              <Link
                to="/profile/edit"
                className="ml-auto text-xs font-medium text-zinc-900 hover:underline"
              >
                Додати
              </Link>
            </div>
          )}
        </section>

        {/* Pets */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
              <PawPrint className="w-4 h-4 text-zinc-700" />
              Мої тваринки
              {pets.length > 0 && (
                <span className="text-zinc-400 normal-case font-normal">({pets.length})</span>
              )}
            </h2>

            {pets.length > 0 && (
              <Link to="/pets" className="text-xs font-medium text-zinc-700 hover:text-zinc-900">
                Керувати
              </Link>
            )}
          </div>

          {pets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center text-2xl">
                🐾
              </div>
              <p className="text-sm text-zinc-500">Ще не додано жодної тваринки</p>
              <Link
                to="/pets/new"
                className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Додати тваринку
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pets.map((pet) => (
                  <PetCard key={pet.id} pet={pet} />
                ))}
              </div>
              <Link
                to="/pets/new"
                className="self-start inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Додати ще тваринку
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
