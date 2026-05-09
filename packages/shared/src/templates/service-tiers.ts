import { PriceUnit, ServiceType } from '../index';

// Готові пропозиції тривалостей тарифу для кожного типу послуги. Caretaker
// натискає кнопку — додається tier з префілом, ціну вписує сам.
// `minutes: null` означає денний тариф (PER_DAY).
export interface ServiceTierDurationTemplate {
    minutes: number | null;
    label: string;
}

export const TIER_DURATION_TEMPLATES: Record<ServiceType, ServiceTierDurationTemplate[]> = {
    [ServiceType.WALKING]: [
        { minutes: 30, label: '30 хв' },
        { minutes: 45, label: '45 хв' },
        { minutes: 60, label: '1 година' },
        { minutes: 90, label: '1.5 години' },
        { minutes: 120, label: '2 години' },
    ],
    [ServiceType.PET_SITTING]: [{ minutes: null, label: 'За добу' }],
    [ServiceType.BOARDING]: [{ minutes: null, label: 'За добу' }],
    [ServiceType.GROOMING]: [
        { minutes: 30, label: '30 хв (експрес)' },
        { minutes: 60, label: '1 година (стандарт)' },
        { minutes: 120, label: '2 години (повний)' },
    ],
    [ServiceType.VET_VISIT]: [
        { minutes: 30, label: '30 хв (огляд)' },
        { minutes: 60, label: '1 година (огляд + процедури)' },
    ],
};

// Стандартна одиниця тарифікації для кожного типу послуги.
export const DEFAULT_PRICE_UNIT: Record<ServiceType, PriceUnit> = {
    [ServiceType.WALKING]: PriceUnit.PER_SESSION,
    [ServiceType.PET_SITTING]: PriceUnit.PER_DAY,
    [ServiceType.BOARDING]: PriceUnit.PER_DAY,
    [ServiceType.GROOMING]: PriceUnit.PER_SESSION,
    [ServiceType.VET_VISIT]: PriceUnit.PER_SESSION,
};
