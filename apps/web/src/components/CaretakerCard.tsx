import { Link } from 'react-router-dom'
import { Star, MapPin, BadgeCheck, ChevronRight } from 'lucide-react'
import { ServiceType } from '@pet-care/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { SearchResult } from '../types'

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома',
  [ServiceType.BOARDING]: 'Пансіон',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринар',
}

interface CaretakerCardProps {
  result: SearchResult
  className?: string
}

export default function CaretakerCard({ result, className }: CaretakerCardProps) {
  const { caretaker, serviceType, price } = result
  const { user } = caretaker

  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user.email

  const initials = user.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow',
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <Avatar className="size-16 border-2 border-border">
            <AvatarFallback className="bg-accent text-accent-foreground text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {caretaker.isVerified && (
            <BadgeCheck className="absolute -bottom-1 -right-1 size-5 text-primary bg-background rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base text-foreground leading-tight">{displayName}</p>

          {/* Service tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant="secondary" className="text-xs font-normal">
              {SERVICE_TYPE_LABELS[serviceType]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs gap-1 font-normal text-foreground">
          <Star className="size-3 fill-amber-400 text-amber-400" />
          Рейтинг
        </Badge>
        {caretaker.experienceYears != null && caretaker.experienceYears > 0 && (
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            {caretaker.experienceYears} {caretaker.experienceYears === 1 ? 'рік' : 'років'} досвіду
          </Badge>
        )}
        {caretaker.radiusKm != null && (
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            <MapPin className="size-3 mr-0.5" />
            радіус {caretaker.radiusKm} км
          </Badge>
        )}
      </div>

      {/* Bio */}
      {caretaker.bio && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {caretaker.bio}
        </p>
      )}

      <Separator />

      {/* Footer row */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-lg font-semibold text-foreground">
            {price} <span className="text-sm font-normal text-muted-foreground">грн / сеанс</span>
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/caretaker/${caretaker.userId}`}>
            Детальніше
            <ChevronRight className="size-3.5 ml-1" />
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link to={`/caretaker/${caretaker.userId}`}>Забронювати</Link>
        </Button>
      </div>
    </div>
  )
}
