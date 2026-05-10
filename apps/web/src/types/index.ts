import type {
  UserRole,
  ServiceType,
  PriceUnit,
  BookingStatus,
  DayType,
  Language,
  MediaOwnerType,
  MediaType,
  MediaBucket,
  MediaItemStatus,
  CaretakerSkill,
  AddonPriceUnit,
  CertificateType,
  DogSize,
  CatSize,
  PetAgeGroup,
  HomeCondition,
  AdditionalServiceCapability,
} from '@pet-care/shared'

export interface MediaItem {
  id: string
  ownerType: MediaOwnerType
  ownerId: string
  bucket: MediaBucket
  storageKey: string
  url: string
  thumbnailKey: string | null
  thumbnailUrl: string | null
  mediaType: MediaType
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  status: MediaItemStatus
  orderIndex: number
  uploadedById: string
  createdAt: string
}

export interface User {
  id: string
  email: string
  role: UserRole
  firstName: string | null
  lastName: string | null
  phone: string | null
  avatarUrl: string | null
  country: string | null
  city: string | null
  street: string | null
  apartment: string | null
  floor: string | null
  entrance: string | null
  createdAt: string
  // /auth/me і /users/:id повертають з relation 'caretakerProfile'.
  caretakerProfile?: CaretakerProfile | null
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
  skills: CaretakerSkill[]
  languages: Language[]
  availabilityFilledUntil: string | null
  availabilityUpdatedAt: string | null
  addressIsPublic: boolean
  isVerified: boolean
  avgRating: string | null
  reviewsCount: number
  country: string | null
  city: string | null
  street: string | null
  apartment: string | null
  floor: string | null
  entrance: string | null
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
  ageMonths: number | null
  weight: string | null
  sex: string | null
  neutered: string | null
  dateAcquired: string | null
  description: string | null
  photoUrl: string | null
  specialNeeds: string | null
  details: PetDetails | null
  createdAt: string
}

export type BehaviorRating = 'good' | 'bad' | 'unknown' | 'depends'

export interface BehaviorAnswer {
  rating: BehaviorRating
  note?: string
}

export type ToiletFrequency = 'every_hour' | 'every_2h' | 'every_4h' | 'every_8h' | 'special'
export type EnergyLevel = 'high' | 'medium' | 'low'
export type FeedingKind = 'morning' | 'twice_daily' | 'special'
export type TimeAloneKind = '1h_or_less' | '1_to_4h' | '4_to_8h' | 'special'
export type MedicationKind = 'pills' | 'injections' | 'topical'

export interface Medication {
  kind: MedicationKind
  name: string
}

export interface PetDetails {
  behaviorWithKids?: BehaviorAnswer
  behaviorWithDogs?: BehaviorAnswer
  behaviorWithCats?: BehaviorAnswer
  toiletFrequency?: { kind: ToiletFrequency; note?: string }
  energyLevel?: EnergyLevel
  feedingSchedule?: { kind: FeedingKind; note?: string }
  timeAlone?: { kind: TimeAloneKind; note?: string }
  medications?: Medication[]
  careNotes?: string
}

export interface ServiceTier {
  id: string
  serviceOfferingId: string
  durationMinutes: number | null
  basePrice: string
  priceUnit: PriceUnit
  dayType: DayType
}

export interface SizeSurcharge {
  id: string
  serviceOfferingId: string
  petSpecies: 'DOG' | 'CAT'
  size: string
  surchargeAmount: string
}

export interface ServiceAddon {
  id: string
  serviceOfferingId: string
  name: string
  description: string | null
  price: string
  priceUnit: AddonPriceUnit
}

export interface ServiceInclusion {
  id: string
  serviceOfferingId: string
  text: string
  orderIndex: number
}

interface BasePolicyFields {
  id: string
  serviceOfferingId: string
  acceptedDogSizes: DogSize[]
  acceptedAgeGroups: PetAgeGroup[]
  acceptsSpecialNeedsPets: boolean
  capabilities: AdditionalServiceCapability[]
}

export interface WalkingPolicy extends BasePolicyFields {
  acceptedCatSizes: CatSize[]
  maxDogsAtOnce: number
}

export interface PetSittingPolicy extends BasePolicyFields {
  acceptedCatSizes: CatSize[]
}

export interface BoardingPolicy extends BasePolicyFields {
  acceptedCatSizes: CatSize[]
  homeConditions: HomeCondition[]
}

export interface ServiceOffering {
  id: string
  caretakerId: string
  serviceType: ServiceType
  description: string | null
  createdAt: string
  // Enriched on /services and /services/:id responses (Phase 5.5)
  tiers?: ServiceTier[]
  sizeSurcharges?: SizeSurcharge[]
  addons?: ServiceAddon[]
  inclusions?: ServiceInclusion[]
  walkingPolicy?: WalkingPolicy | null
  petSittingPolicy?: PetSittingPolicy | null
  boardingPolicy?: BoardingPolicy | null
  // @deprecated — фактично відсутні у відповіді бекенду після Phase 5.5,
  // але залишені для legacy-сторінок (ProfileEditPage, CaretakerCard,
  // SearchPage). На runtime повертають undefined; UI рендериться зламаним
  // у цих місцях, але це буде виправлено в 6.5.3 (заміна на tiers[]).
  price: string
  priceUnit: PriceUnit
  durationMinutes: number | null
}

// Search result: ServiceOffering with nested caretaker + user (from backend join)
export interface SearchResult extends ServiceOffering {
  caretaker: CaretakerProfile & {
    user: User
  }
}

export interface Certificate {
  id: string
  caretakerProfileId: string
  type: CertificateType
  title: string
  mediaItemId: string
  mediaItem?: MediaItem
  uploadedAt: string
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
  tierId: string
  addonIds?: string[]
  scheduledStart: string
  scheduledEnd: string
  notes?: string
}

export interface ReviewsStats {
  reviews: Review[]
  averageRating: number | null
  totalCount: number
}