import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, MapPin, BadgeCheck, Heart, MessageCircle, Briefcase } from 'lucide-react'
import { PriceUnit, ServiceType } from '@pet-care/shared'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useReverseGeocode } from '@/hooks/useReverseGeocode'
import { PRICE_UNIT_LABELS } from '@/lib/caretaker-labels'
import { chatService } from '../services/chat.service'
import { useAuthStore } from '../store/authStore'
import type { CaretakerProfile, ServiceOffering, User } from '../types'

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома',
  [ServiceType.BOARDING]: 'Перетримка',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринар',
}

export type CaretakerOffering = ServiceOffering

export interface CaretakerCardData {
  caretaker: CaretakerProfile & { user: User }
  offerings: CaretakerOffering[]
}

interface MinPrice {
  amount: number
  unit: PriceUnit
}

function minPriceFromOffering(o: ServiceOffering): MinPrice | null {
  const tiers = o.tiers ?? []
  if (tiers.length === 0) return null
  let best: MinPrice | null = null
  for (const t of tiers) {
    const amount = parseFloat(t.basePrice)
    if (Number.isNaN(amount)) continue
    if (!best || amount < best.amount) {
      best = { amount, unit: t.priceUnit }
    }
  }
  return best
}

interface CaretakerCardProps {
  data: CaretakerCardData
  highlightedServiceType?: ServiceType | null
  onHover?: (id: string | null) => void
  className?: string
}

function pluralizeYears(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'рік'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'роки'
  return 'років'
}

function pluralizeReviews(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'відгук'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'відгуки'
  return 'відгуків'
}

export default function CaretakerCard({
  data,
  highlightedServiceType,
  onHover,
  className,
}: CaretakerCardProps) {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { caretaker, offerings } = data
  const { user } = caretaker
  const [liked, setLiked] = useState(false)

  const cityLabel = useReverseGeocode(caretaker.serviceLatitude, caretaker.serviceLongitude)

  const fullName =
    user.firstName || user.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : user.email
  const initials = (
    (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? user.email[0])
  ).toUpperCase()

  const offeringsWithPrice = offerings
    .map((o) => ({ offering: o, min: minPriceFromOffering(o) }))
    .filter((x): x is { offering: ServiceOffering; min: MinPrice } => x.min !== null)

  const featured =
    (highlightedServiceType &&
      offeringsWithPrice.find((x) => x.offering.serviceType === highlightedServiceType)) ||
    [...offeringsWithPrice].sort((a, b) => a.min.amount - b.min.amount)[0]

  const showFromPrefix = !highlightedServiceType && offerings.length > 1
  const rating = caretaker.avgRating != null ? parseFloat(caretaker.avgRating) : null

  function handleProfileClick() {
    navigate(`/caretaker/${caretaker.userId}`)
  }

  return (
    <article
      className={cn(
        'group relative bg-white border border-zinc-200 rounded-xl p-4 flex flex-col gap-3',
        'hover:shadow-md hover:border-zinc-300 transition cursor-pointer',
        className,
      )}
      onMouseEnter={() => onHover?.(caretaker.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={handleProfileClick}
    >
      <button
        type="button"
        aria-label={liked ? 'Прибрати з обраного' : 'Додати в обране'}
        onClick={(e) => {
          e.stopPropagation()
          setLiked((v) => !v)
        }}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/85 backdrop-blur hover:bg-white shadow-sm transition"
      >
        <Heart
          className={cn(
            'w-4 h-4 transition',
            liked ? 'text-rose-500 fill-rose-500' : 'text-zinc-400',
          )}
        />
      </button>

      <div className="flex items-start gap-3 pr-9">
        <div className="relative shrink-0">
          <Avatar className="w-16 h-16 border border-zinc-200">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={fullName} />}
            <AvatarFallback className="bg-zinc-100 text-zinc-700 text-base font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {caretaker.isVerified && (
            <span
              title="Верифікований профіль"
              className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"
            >
              <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-100" strokeWidth={2.2} />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-semibold text-zinc-900 text-base leading-tight truncate">
              {fullName}
            </h3>
            {caretaker.isVerified && (
              <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                Перевірено
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{cityLabel ?? 'Локація уточнюється…'}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {offerings.map((o) => (
              <span
                key={o.id}
                className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full border',
                  o.serviceType === highlightedServiceType
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200',
                )}
              >
                {SERVICE_TYPE_LABELS[o.serviceType]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-700">
        {rating != null ? (
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-zinc-900">{rating.toFixed(1)}</span>
            <span className="text-zinc-500">/ 5</span>
          </span>
        ) : (
          <span className="text-zinc-400">Без рейтингу</span>
        )}

        {caretaker.reviewsCount > 0 && (
          <span className="text-zinc-500">
            {caretaker.reviewsCount} {pluralizeReviews(caretaker.reviewsCount)}
          </span>
        )}

        {caretaker.experienceYears != null && caretaker.experienceYears > 0 && (
          <span className="flex items-center gap-1 text-zinc-500">
            <Briefcase className="w-3 h-3" />
            {caretaker.experienceYears} {pluralizeYears(caretaker.experienceYears)} досвіду
          </span>
        )}
      </div>

      {caretaker.bio && (
        <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">{caretaker.bio}</p>
      )}

      <div className="border-t border-zinc-100" />

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {featured ? (
            <p className="text-zinc-900">
              {showFromPrefix && (
                <span className="text-xs text-zinc-500">від </span>
              )}
              <span className="text-lg font-semibold">
                {featured.min.amount.toFixed(0)} грн
              </span>
              <span className="text-xs text-zinc-500">
                {' / '}
                {PRICE_UNIT_LABELS[featured.min.unit]}
              </span>
            </p>
          ) : (
            <p className="text-zinc-400 text-sm">Тарифи ще не задані</p>
          )}
        </div>

        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation()
            if (!isAuthenticated) {
              navigate(
                `/login?redirect=${encodeURIComponent(`/caretaker/${user.id}`)}`,
              )
              return
            }
            try {
              const { id: convId } = await chatService.startConversation(user.id)
              navigate(`/messages/${convId}`)
            } catch {
              /* ignore */
            }
          }}
          className="flex items-center gap-1 h-9 px-3 text-sm font-medium text-zinc-900 border border-zinc-200 rounded-md hover:bg-zinc-50 transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Написати
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!isAuthenticated) {
              navigate(
                `/login?redirect=${encodeURIComponent(`/caretaker/${user.id}`)}`,
              )
              return
            }
            const params = new URLSearchParams({ caretakerId: user.id })
            const target =
              highlightedServiceType ??
              featured?.offering.serviceType
            if (target) params.set('service', target)
            navigate(`/bookings/new?${params.toString()}`)
          }}
          className="h-9 px-4 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition"
        >
          Забронювати
        </button>
      </div>
    </article>
  )
}
