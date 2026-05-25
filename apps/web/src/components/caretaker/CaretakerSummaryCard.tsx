import { useState } from 'react'
import { BadgeCheck, Heart, MessageCircle, Star, ChevronRight } from 'lucide-react'
import { ServiceType } from '@pet-care/shared'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import AvailabilityCalendar from './AvailabilityCalendar'
import type { CaretakerProfile, ServiceOffering, User } from '../../types'

const SERVICE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома',
  [ServiceType.BOARDING]: 'Перетримка',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринар',
}

interface CaretakerSummaryCardProps {
  user: User
  profile: CaretakerProfile
  offerings: ServiceOffering[]
  onShowFullPricelist: () => void
  onMessage: () => void
  onBook: () => void
  className?: string
}

export default function CaretakerSummaryCard({
  user,
  profile,
  offerings,
  onShowFullPricelist,
  onMessage,
  onBook,
  className,
}: CaretakerSummaryCardProps) {
  const [liked, setLiked] = useState(false)

  const fullName =
    user.firstName || user.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : user.email
  const initials = (
    (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? user.email[0])
  ).toUpperCase()

  // group offerings by serviceType — show min price per service from real tiers
  const minByService = new Map<ServiceType, number>()
  for (const o of offerings) {
    const tiers = o.tiers ?? []
    if (tiers.length === 0) continue
    const minTier = Math.min(...tiers.map((t) => parseFloat(t.basePrice)))
    const cur = minByService.get(o.serviceType)
    if (cur == null || minTier < cur) minByService.set(o.serviceType, minTier)
  }

  const rating = profile.avgRating != null ? parseFloat(profile.avgRating) : null

  return (
    <aside
      className={cn(
        'bg-white border border-zinc-200 rounded-xl flex flex-col gap-4 p-5 shadow-sm',
        className,
      )}
    >
      {/* Header — avatar + name + like */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar className="w-20 h-20 border border-zinc-200">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={fullName} />}
            <AvatarFallback className="bg-zinc-100 text-zinc-700 text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {profile.isVerified && (
            <span
              title="Верифікований профіль"
              className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"
            >
              <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-100" strokeWidth={2.2} />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-semibold text-zinc-900 leading-tight">{fullName}</h1>
            <button
              type="button"
              onClick={() => setLiked((v) => !v)}
              aria-label={liked ? 'Прибрати з обраного' : 'Додати в обране'}
              className="shrink-0 p-1.5 rounded-full border border-zinc-200 hover:bg-zinc-50 transition"
            >
              <Heart
                className={cn(
                  'w-4 h-4 transition',
                  liked ? 'text-rose-500 fill-rose-500' : 'text-zinc-400',
                )}
              />
            </button>
          </div>

          {profile.isVerified && (
            <span className="inline-block mt-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              Перевірено
            </span>
          )}

          {rating != null && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-zinc-700">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-zinc-900">{rating.toFixed(1)}</span>
              <span className="text-zinc-500">/ 5</span>
              {profile.reviewsCount > 0 && (
                <span className="text-zinc-500">· {profile.reviewsCount} відгуків</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Service prices preview — "Вигул від 180 грн" */}
      {minByService.size > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Послуги</p>
          <ul className="flex flex-col gap-1">
            {Array.from(minByService.entries()).map(([type, price]) => (
              <li
                key={type}
                className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-100 last:border-0"
              >
                <span className="text-zinc-700">{SERVICE_LABELS[type]}</span>
                <span className="text-zinc-900">
                  <span className="text-xs text-zinc-500">від </span>
                  <span className="font-semibold tabular-nums">{price} грн</span>
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onShowFullPricelist}
            className="self-start mt-1 flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 transition"
          >
            Дивитися весь прайслист
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="border-t border-zinc-100" />

      {/* Availability calendar */}
      <AvailabilityCalendar caretakerId={profile.id} />

      <div className="border-t border-zinc-100" />

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onMessage}
          className="flex-1 flex items-center justify-center gap-1 h-10 px-3 text-sm font-medium text-zinc-900 border border-zinc-200 rounded-md hover:bg-zinc-50 transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Написати
        </button>
        <button
          type="button"
          onClick={onBook}
          className="flex-1 h-10 px-4 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition"
        >
          Забронювати
        </button>
      </div>
    </aside>
  )
}
