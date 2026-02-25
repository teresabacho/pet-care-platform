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
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum PriceUnit {
    PER_SESSION = 'PER_SESSION',
    PER_HOUR = 'PER_HOUR',
    PER_DAY = 'PER_DAY',
}