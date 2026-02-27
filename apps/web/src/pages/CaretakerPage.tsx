import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ServiceType } from '@pet-care/shared'
import { usersService } from '../services/users.service'
import { serviceOfferingsService } from '../services/service-offerings.service'
import { reviewsService } from '../services/reviews.service'
import type { UserPublic, ServiceOffering, ReviewsStats } from '../types'

const SERVICE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома',
  [ServiceType.BOARDING]: 'Пансіон',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Ветеринар',
}

export default function CaretakerPage() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [offerings, setOfferings] = useState<ServiceOffering[]>([])
  const [reviews, setReviews] = useState<ReviewsStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      usersService.getById(id),
      serviceOfferingsService.getByCaretaker(id),
      reviewsService.getByUser(id),
    ])
      .then(([userData, offeringsData, reviewsData]) => {
        setUser(userData)
        setOfferings(offeringsData)
        setReviews(reviewsData)
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) return <div className="text-center py-12 text-gray-400">Завантаження...</div>
  if (notFound || !user) return (
    <div className="text-center py-12">
      <p className="text-gray-500 mb-3">Профіль не знайдено</p>
      <Link to="/search" className="text-blue-600 hover:underline">← Повернутись до пошуку</Link>
    </div>
  )

  const profile = user.caretakerProfile
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            {reviews && reviews.totalCount > 0 && (
              <p className="text-yellow-500 mt-1">
                ★ {reviews.averageRating?.toFixed(1)} · {reviews.totalCount} відгук{reviews.totalCount > 1 ? 'ів' : ''}
              </p>
            )}
          </div>
          {profile?.isVerified && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Верифіковано
            </span>
          )}
        </div>
        {profile?.bio && <p className="mt-3 text-gray-600">{profile.bio}</p>}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
          {profile?.experienceYears != null && (
            <span>Досвід: {profile.experienceYears} р.</span>
          )}
          {profile?.radiusKm != null && (
            <span>Радіус: {profile.radiusKm} км</span>
          )}
        </div>
      </div>

      {/* Services */}
      {offerings.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Послуги</h2>
          <div className="space-y-2">
            {offerings.map((offering) => (
              <div key={offering.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{SERVICE_LABELS[offering.serviceType]}</p>
                  {offering.description && (
                    <p className="text-xs text-gray-400">{offering.description}</p>
                  )}
                </div>
                <span className="text-blue-700 font-semibold text-sm">{offering.price} грн</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {reviews && reviews.reviews.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Відгуки</h2>
          <div className="space-y-3">
            {reviews.reviews.map((review) => (
              <div key={review.id} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString('uk-UA')}
                  </span>
                </div>
                {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}