import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserRole } from '@pet-care/shared'
import { useAuthStore } from '../store/authStore'
import { caretakerProfileService } from '../services/caretaker-profile.service'
import { serviceOfferingsService } from '../services/service-offerings.service'
import { Button } from '@/components/ui/button'

type Status = 'no-profile' | 'no-services' | 'active' | 'unknown'

// Банер для авторизованих CARETAKER:
//   - 'no-profile' (червоний): профіль не створено → веде на wizard
//   - 'no-services' (амбер): профіль створено, але без послуг — клієнти не побачать
//   - 'active': нічого не показуємо
export default function CaretakerOnboardingBanner() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [status, setStatus] = useState<Status>('unknown')

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated || user?.role !== UserRole.CARETAKER) {
      setStatus('unknown')
      return
    }

    async function check() {
      try {
        const profile = await caretakerProfileService.getMyCaretakerProfile()
        if (cancelled) return
        if (profile === null) {
          setStatus('no-profile')
          return
        }
        if (!user) return
        const services = await serviceOfferingsService
          .getByCaretaker(user.id)
          .catch(() => [])
        if (cancelled) return
        setStatus(services.length === 0 ? 'no-services' : 'active')
      } catch {
        if (!cancelled) setStatus('unknown')
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user])

  if (status === 'unknown' || status === 'active') {
    return null
  }

  if (status === 'no-profile') {
    return (
      <div className="bg-rose-50 border-b border-rose-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-rose-900">
            Ви маєте акаунт доглядальника, але ще не створили публічний профіль. Без нього клієнти вас не побачать.
          </p>
          <Link to="/settings/caretaker-profile/onboarding">
            <Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white whitespace-nowrap">
              Створити профіль
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // no-services
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-amber-900">
          Профіль створено, але неактивний — поки немає жодної послуги, клієнти не зможуть вас замовити.
        </p>
        <Link to="/settings/caretaker-profile">
          <Button size="sm" variant="outline" className="whitespace-nowrap">
            Додати послугу
          </Button>
        </Link>
      </div>
    </div>
  )
}
