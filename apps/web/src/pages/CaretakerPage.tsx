import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { MediaOwnerType, ServiceType } from '@pet-care/shared'
import { usersService } from '../services/users.service'
import { serviceOfferingsService } from '../services/service-offerings.service'
import { chatService } from '../services/chat.service'
import { useAuthStore } from '../store/authStore'
import type { ServiceOffering, UserPublic } from '../types'
import CaretakerSummaryCard from '../components/caretaker/CaretakerSummaryCard'
import { MediaGallerySection } from '../components/media'
import InfoCards from '../components/caretaker/InfoCards'
import LocationSection from '../components/caretaker/LocationSection'
import ServiceTabBar from '../components/caretaker/ServiceTabBar'
import ExperienceSection from '../components/caretaker/ExperienceSection'
import PetAcceptance from '../components/caretaker/PetAcceptance'
import ServiceConditions from '../components/caretaker/ServiceConditions'
import PriceList from '../components/caretaker/PriceList'
import CertificatesSection from '../components/caretaker/CertificatesSection'

export default function CaretakerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [user, setUser] = useState<UserPublic | null>(null)
  const [offerings, setOfferings] = useState<ServiceOffering[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeService, setActiveService] = useState<ServiceType | null>(null)
  const priceListRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    setNotFound(false)
    Promise.all([usersService.getById(id), serviceOfferingsService.getByCaretaker(id)])
      .then(([userData, offeringsData]) => {
        setUser(userData)
        setOfferings(offeringsData)
        if (offeringsData.length > 0) {
          setActiveService(offeringsData[0].serviceType)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false))
  }, [id])

  const profile = user?.caretakerProfile ?? null

  // unique service types from this caretaker's offerings
  const serviceTypes = useMemo(() => {
    const seen = new Set<ServiceType>()
    return offerings
      .filter((o) => {
        if (seen.has(o.serviceType)) return false
        seen.add(o.serviceType)
        return true
      })
      .map((o) => o.serviceType)
  }, [offerings])

  const activeOffering = useMemo(
    () => offerings.find((o) => o.serviceType === activeService) ?? null,
    [offerings, activeService],
  )

  function scrollToPricelist() {
    priceListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-400">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    )
  }

  if (notFound || !user || !profile) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 mb-3">Профіль не знайдено</p>
        <Link to="/search" className="text-zinc-900 underline">
          ← Повернутись до пошуку
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-zinc-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6">
        {/* LEFT — sticky summary */}
        <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <CaretakerSummaryCard
            user={user}
            profile={profile}
            offerings={offerings}
            onShowFullPricelist={scrollToPricelist}
            onMessage={async () => {
              if (!isAuthenticated) {
                navigate(
                  `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
                )
                return
              }
              try {
                const { id: convId } = await chatService.startConversation(
                  user.id,
                )
                navigate(`/messages/${convId}`)
              } catch {
                // silent failure — UI fallback could be a toast later
              }
            }}
            onBook={() => {
              if (!isAuthenticated) {
                navigate(
                  `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
                )
                return
              }
              const params = new URLSearchParams({ caretakerId: user.id })
              if (activeService) params.set('service', activeService)
              navigate(`/bookings/new?${params.toString()}`)
            }}
          />
        </div>

        {/* RIGHT — scrollable detail */}
        <div className="flex flex-col gap-6 min-w-0">
          {profile && (
            <MediaGallerySection
              ownerType={MediaOwnerType.CARETAKER_GALLERY}
              ownerId={profile.id}
            />
          )}

          <InfoCards profile={profile} />

          <LocationSection profile={profile} />

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-zinc-900">Про мене</h2>
            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
              {profile.bio ?? 'Доглядальник ще не додав опис.'}
            </p>
          </section>

          {/* Tabs control both experience + pricelist sections below */}
          {activeService && serviceTypes.length > 0 && activeOffering && (
            <>
              <ServiceTabBar
                services={serviceTypes}
                active={activeService}
                onChange={setActiveService}
              />

              <ExperienceSection
                profile={profile}
                offering={activeOffering}
              />

              <PetAcceptance offering={activeOffering} />

              <ServiceConditions offering={activeOffering} />

              <PriceList ref={priceListRef} offering={activeOffering} />
            </>
          )}

          <CertificatesSection caretakerProfileId={profile.id} />
        </div>
      </div>
    </div>
  )
}
