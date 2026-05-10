export enum UserRole {
    OWNER = 'OWNER',
    CARETAKER = 'CARETAKER',
}

export enum ServiceType {
    WALKING = 'WALKING',
    PET_SITTING = 'PET_SITTING',
    BOARDING = 'BOARDING',
    GROOMING = 'GROOMING',
    VET_VISIT = 'VET_VISIT',
}

// Одиниця тарифікації послуги
// PER_SESSION — фіксована ціна за сеанс (наприклад, вигул 1 год = 150 грн)
// PER_HOUR    — погодинна ставка
// PER_DAY     — добова ставка (перетримка, пет-сіттінг)
export enum BookingStatus {
    PENDING           = 'PENDING',
    CONFIRMED         = 'CONFIRMED',
    HANDOVER_PENDING  = 'HANDOVER_PENDING',
    IN_PROGRESS       = 'IN_PROGRESS',
    RETURN_PENDING    = 'RETURN_PENDING',
    COMPLETED         = 'COMPLETED',
    CANCELLED         = 'CANCELLED',
}

export enum PriceUnit {
    PER_SESSION = 'PER_SESSION',
    PER_HOUR = 'PER_HOUR',
    PER_DAY = 'PER_DAY',
}

// Тип дня для тарифу. REGULAR — будні. WEEKEND — субота/неділя.
// HOLIDAY — державні свята (поки caretaker сам декларує наявність такого
// тарифу; календар свят підключиться окремо). Booking при створенні
// підбирає найбільш специфічний tier тієї ж тривалості залежно від
// дати: HOLIDAY > WEEKEND > REGULAR (з fallback на REGULAR).
export enum DayType {
    REGULAR = 'REGULAR',
    WEEKEND = 'WEEKEND',
    HOLIDAY = 'HOLIDAY',
}

// Мови, якими caretaker може спілкуватися з клієнтом. Коди ISO 639-1.
// Список свідомо обмежений — можна розширити, коли реальні користувачі
// почнуть запитувати інші.
export enum Language {
    UK = 'UK',
    EN = 'EN',
    RU = 'RU',
    PL = 'PL',
    DE = 'DE',
    FR = 'FR',
    ES = 'ES',
}

export const LANGUAGE_LABELS: Record<Language, string> = {
    [Language.UK]: 'Українська',
    [Language.EN]: 'English',
    [Language.RU]: 'Російська',
    [Language.PL]: 'Polski',
    [Language.DE]: 'Deutsch',
    [Language.FR]: 'Français',
    [Language.ES]: 'Español',
};

export enum TrackingSessionStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum WalkSegmentStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
}

// Тип сутності, до якої прив'язаний MediaItem.
// ownerId інтерпретується відповідно до цього enum (поліморфне посилання
// без foreign key — цілісність гарантується на рівні сервісу).
export enum MediaOwnerType {
    USER_AVATAR = 'USER_AVATAR',
    PET_AVATAR = 'PET_AVATAR',
    CARETAKER_GALLERY = 'CARETAKER_GALLERY',
    PET_GALLERY = 'PET_GALLERY',
    REVIEW_PHOTO = 'REVIEW_PHOTO',
    MESSAGE_MEDIA = 'MESSAGE_MEDIA',
    CARETAKER_CERTIFICATE = 'CARETAKER_CERTIFICATE',
}

// Стани життєвого циклу MediaItem.
// PENDING — рядок створено, файл ще не підтверджений (presigned upload flow).
// READY — файл у сховищі і прив'язаний до сутності.
// DELETED — soft delete; cron видалить файл з S3 повністю.
// EXPIRED — PENDING, який не був confirmed протягом TTL; файл, якщо є, прибирається.
export enum MediaItemStatus {
    PENDING = 'PENDING',
    READY = 'READY',
    DELETED = 'DELETED',
    EXPIRED = 'EXPIRED',
}

export enum MediaType {
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    DOCUMENT = 'DOCUMENT',
}

export enum MediaBucket {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
}

// ISO 3166-1 alpha-2 коди країн, де платформа працює.
// Щоб додати нову країну: дописати enum, COUNTRY_LABELS, COUNTRY_NOMINATIM_CODES,
// та (опціонально) TOP_CITIES — далі вона автоматично підтягнеться у пошуку,
// AddressPicker і будь-де, що читає SUPPORTED_COUNTRIES.
export enum Country {
    UA = 'UA',
    PL = 'PL',
    HU = 'HU',
}

export const COUNTRY_LABELS: Record<Country, string> = {
    [Country.UA]: 'Україна',
    [Country.PL]: 'Польща',
    [Country.HU]: 'Угорщина',
};

// ISO 3166-1 alpha-2 коди в нижньому регістрі — формат, який очікує Nominatim
// у параметрі ?countrycodes=...
export const COUNTRY_NOMINATIM_CODES: Record<Country, string> = {
    [Country.UA]: 'ua',
    [Country.PL]: 'pl',
    [Country.HU]: 'hu',
};

export const SUPPORTED_COUNTRIES: Country[] = Object.values(Country);

export interface TopCity {
    nameUk: string;
    country: Country;
    lat: number;
    lng: number;
}

// Список міст, які показуються як підказки до того, як користувач почав вводити.
// Базується на топ-3-5 містах кожної підтримуваної країни. Координати — з OpenStreetMap.
// Згодом цей список можна замінити на динамічний на основі реального розподілу замовлень.
export const TOP_CITIES: TopCity[] = [
    { nameUk: 'Київ', country: Country.UA, lat: 50.4501, lng: 30.5234 },
    { nameUk: 'Львів', country: Country.UA, lat: 49.8397, lng: 24.0297 },
    { nameUk: 'Харків', country: Country.UA, lat: 49.9935, lng: 36.2304 },
    { nameUk: 'Одеса', country: Country.UA, lat: 46.4825, lng: 30.7233 },
    { nameUk: 'Дніпро', country: Country.UA, lat: 48.4647, lng: 35.0462 },
    { nameUk: 'Варшава', country: Country.PL, lat: 52.2297, lng: 21.0122 },
    { nameUk: 'Краків', country: Country.PL, lat: 50.0647, lng: 19.945 },
    { nameUk: 'Вроцлав', country: Country.PL, lat: 51.1079, lng: 17.0385 },
    { nameUk: 'Будапешт', country: Country.HU, lat: 47.4979, lng: 19.0402 },
    { nameUk: 'Дебрецен', country: Country.HU, lat: 47.5316, lng: 21.6273 },
];

// Навички доглядальника. Прив'язані до особи (CaretakerProfile), а не до конкретної послуги —
// одна людина має ті самі сертифікати/вміння для всіх своїх послуг.
export enum CaretakerSkill {
    INJECTIONS          = 'INJECTIONS',
    FIRST_AID           = 'FIRST_AID',
    PHOTO_VIDEO_REPORTS = 'PHOTO_VIDEO_REPORTS',
    SPECIAL_NEEDS       = 'SPECIAL_NEEDS',
    FEEDING_SCHEDULE    = 'FEEDING_SCHEDULE',
    DOG_TRAINER         = 'DOG_TRAINER',
    POST_SURGERY_CARE   = 'POST_SURGERY_CARE',
}

// Розмір собаки. MEDIUM — базова категорія, для якої встановлюється `ServiceTier.basePrice`.
// Інші розміри використовують `SizeSurcharge.surchargeAmount` (може бути від'ємним).
export enum DogSize {
    MINI        = 'MINI',          // до 4 кг
    SMALL       = 'SMALL',         // 4–10 кг
    MEDIUM      = 'MEDIUM',        // 10–25 кг — БАЗОВИЙ
    LARGE       = 'LARGE',         // 25–40 кг
    EXTRA_LARGE = 'EXTRA_LARGE',   // 40+ кг
}

// Розмір кота. MEDIUM — базова категорія для `ServiceTier.basePrice`.
export enum CatSize {
    SMALL  = 'SMALL',   // до 3.5 кг
    MEDIUM = 'MEDIUM',  // 3.5–6.5 кг — БАЗОВИЙ
    LARGE  = 'LARGE',   // 6.5+ кг
}

export enum PetAgeGroup {
    PUPPY_OR_KITTEN = 'PUPPY_OR_KITTEN',
    YOUNG           = 'YOUNG',
    ADULT           = 'ADULT',
    SENIOR          = 'SENIOR',
    ELDERLY         = 'ELDERLY',
}

// Умови дому для BoardingPolicy. Структуровані як opt-in взаємовиключні пари —
// доглядальник може не вказувати ознаку взагалі, але якщо вказав «без двору»,
// то «з двором» уже не може. Сервер валідує конфлікти за HOME_CONDITION_CONFLICTS.
export enum HomeCondition {
    APARTMENT                   = 'APARTMENT',
    HOUSE                       = 'HOUSE',
    HAS_BALCONY                 = 'HAS_BALCONY',
    NO_BALCONY                  = 'NO_BALCONY',
    HAS_YARD                    = 'HAS_YARD',
    NO_YARD                     = 'NO_YARD',
    HAS_SEPARATE_PET_AREA       = 'HAS_SEPARATE_PET_AREA',
    NO_SEPARATE_PET_AREA        = 'NO_SEPARATE_PET_AREA',
    PETS_ON_FURNITURE_ALLOWED   = 'PETS_ON_FURNITURE_ALLOWED',
    PETS_ON_FURNITURE_FORBIDDEN = 'PETS_ON_FURNITURE_FORBIDDEN',
    PETS_ON_BED_ALLOWED         = 'PETS_ON_BED_ALLOWED',
    PETS_ON_BED_FORBIDDEN       = 'PETS_ON_BED_FORBIDDEN',
    SMOKE_FREE                  = 'SMOKE_FREE',
    HAS_SMOKERS                 = 'HAS_SMOKERS',
    NO_KIDS                     = 'NO_KIDS',
    HAS_KIDS                    = 'HAS_KIDS',
    NO_OTHER_PETS               = 'NO_OTHER_PETS',
    HAS_OTHER_PETS              = 'HAS_OTHER_PETS',
}

// Додаткові спроможності, спільні для політик пет-сіттінгу/боардингу/прогулянок.
export enum AdditionalServiceCapability {
    HAS_OWN_TRANSPORT = 'HAS_OWN_TRANSPORT',
    PICKUP_DELIVERY   = 'PICKUP_DELIVERY',
    VET_TRANSPORT     = 'VET_TRANSPORT',
    GROOMING_BASIC    = 'GROOMING_BASIC',
}

// Одиниця тарифікації для ServiceAddon. Множник застосовується при створенні Booking:
// PER_BOOKING — ×1, PER_DAY — ×days, PER_WALK — ×walks.
export enum AddonPriceUnit {
    PER_BOOKING = 'PER_BOOKING',
    PER_DAY     = 'PER_DAY',
    PER_WALK    = 'PER_WALK',
}

export enum CertificateType {
    VET_DEGREE        = 'VET_DEGREE',
    TRAINER_COURSE    = 'TRAINER_COURSE',
    FIRST_AID_COURSE  = 'FIRST_AID_COURSE',
    GROOMING_COURSE   = 'GROOMING_COURSE',
    SCHOOL_DIPLOMA    = 'SCHOOL_DIPLOMA',
    COLLEGE_DIPLOMA   = 'COLLEGE_DIPLOMA',
    UNIVERSITY_DEGREE = 'UNIVERSITY_DEGREE',
    OTHER             = 'OTHER',
}

// Пари HomeCondition, які не можуть бути активні одночасно для одного житла.
// Використовується серверним валідатором @NoConflictingHomeConditions і фронтенд-формою
// (radio buttons всередині пари).
export const HOME_CONDITION_CONFLICTS: ReadonlyArray<readonly [HomeCondition, HomeCondition]> = [
    [HomeCondition.APARTMENT, HomeCondition.HOUSE],
    [HomeCondition.HAS_BALCONY, HomeCondition.NO_BALCONY],
    [HomeCondition.HAS_YARD, HomeCondition.NO_YARD],
    [HomeCondition.HAS_SEPARATE_PET_AREA, HomeCondition.NO_SEPARATE_PET_AREA],
    [HomeCondition.PETS_ON_FURNITURE_ALLOWED, HomeCondition.PETS_ON_FURNITURE_FORBIDDEN],
    [HomeCondition.PETS_ON_BED_ALLOWED, HomeCondition.PETS_ON_BED_FORBIDDEN],
    [HomeCondition.SMOKE_FREE, HomeCondition.HAS_SMOKERS],
    [HomeCondition.NO_KIDS, HomeCondition.HAS_KIDS],
    [HomeCondition.NO_OTHER_PETS, HomeCondition.HAS_OTHER_PETS],
];

export * from './templates';