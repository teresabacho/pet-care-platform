import type { UserRole, ServiceType, PriceUnit, BookingStatus } from '@pet-care/shared'

export interface User {
  id: string
  email: string
  role: UserRole
  firstName: string | null
  lastName: string | null
  phone: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface CaretakerProfile {
  id: string
  userId: string
  bio: string | null
  experienceYears: number | null
  hourlyRate: string | null
  serviceTypes: ServiceType[]
  serviceLatitude: number | null
  serviceLongitude: number | null
  radiusKm: number | null
  isVerified: boolean
}

export interface UserPublic extends User {
  caretakerProfile: CaretakerProfile | null
}

export interface Pet {
  id: string
  ownerId: string
  name: string
  species: string | null
  breed: string | null
  age: number | null
  weight: string | null
  description: string | null
  photoUrl: string | null
  specialNeeds: string | null
  createdAt: string
}

export interface ServiceOffering {
  id: string
  caretakerId: string
  serviceType: ServiceType
  price: string
  priceUnit: PriceUnit
  durationMinutes: number | null
  description: string | null
  createdAt: string
}

// Search result: ServiceOffering with nested caretaker + user (from backend join)
export interface SearchResult extends ServiceOffering {
  caretaker: CaretakerProfile & {
    user: User
  }
}

export interface Review {
  id: string
  authorId: string
  targetId: string
  bookingId: string
  rating: number
  comment: string | null
  createdAt: string
}

export interface Booking {
  id: string
  ownerId: string
  caretakerId: string
  petId: string
  serviceType: ServiceType
  status: BookingStatus
  scheduledStart: string
  scheduledEnd: string
  actualStart: string | null
  actualEnd: string | null
  price: string
  notes: string | null
  handoverConfirmedByOwner: boolean
  handoverConfirmedByCaretaker: boolean
  returnConfirmedByOwner: boolean
  returnConfirmedByCaretaker: boolean
  createdAt: string
  // joined relations (present in detail responses)
  owner?: User
  caretaker?: User
  pet?: Pet
}

export interface CreateBookingDto {
  caretakerId: string
  petId: string
  serviceType: ServiceType
  scheduledStart: string
  scheduledEnd: string
  price: number
  notes?: string
}

export interface ReviewsStats {
  reviews: Review[]
  averageRating: number | null
  totalCount: number
}