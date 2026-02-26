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

export enum TrackingSessionStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum WalkSegmentStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
}