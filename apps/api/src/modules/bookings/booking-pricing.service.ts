import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { AddonPriceUnit, DayType, isUkrainianHoliday, PriceUnit } from '@pet-care/shared';
import { Pet } from '../pets/entities/pet.entity';
import { ServiceTiersRepository } from '../services/tiers/service-tiers.repository';
import { ServiceTier } from '../services/tiers/entities/service-tier.entity';
import { SizeSurchargesRepository } from '../services/size-surcharges/size-surcharges.repository';
import { ServiceAddonsRepository } from '../services/addons/service-addons.repository';

interface PricingInput {
    tierId: string;
    addonIds: string[];
    pet: Pet;
    serviceOfferingId?: string; // якщо null, перевіряємо через tier
    scheduledStart: Date;
    scheduledEnd: Date;
}

interface PricingResult {
    price: number;
    serviceOfferingId: string;
}

@Injectable()
export class BookingPricingService {
    constructor(
        private readonly tiersRepo: ServiceTiersRepository,
        private readonly surchargesRepo: SizeSurchargesRepository,
        private readonly addonsRepo: ServiceAddonsRepository,
    ) {}

    async calculate(input: PricingInput): Promise<PricingResult> {
        const initial = await this.tiersRepo.findById(input.tierId);
        if (!initial) {
            throw new NotFoundException('ServiceTier не знайдено');
        }
        const offeringId = initial.serviceOfferingId;

        // Для PER_DAY-тарифів (PET_SITTING/BOARDING) ітеруємо кожен день у
        // діапазоні booking-а та сумуємо ставку, що відповідає DayType дня.
        // Для PER_SESSION/PER_HOUR — застосовуємо одну ставку за стартовою
        // датою (це одна подія, а не період).
        const allTiers = await this.tiersRepo.findByOfferingId(offeringId);
        const matchTier = (date: Date): ServiceTier => {
            const dt = getDayType(date);
            if (dt === DayType.REGULAR) return initial;
            const found = allTiers.find(
                (t) =>
                    t.durationMinutes === initial.durationMinutes && t.dayType === dt,
            );
            return found ?? initial;
        };

        let total = 0;
        if (initial.priceUnit === PriceUnit.PER_DAY) {
            for (const day of listDaysInRange(input.scheduledStart, input.scheduledEnd)) {
                total += Number(matchTier(day).basePrice);
            }
        } else {
            total = Number(matchTier(input.scheduledStart).basePrice);
        }

        // Sage surcharge — лише якщо вказані species і size; інакше трактуємо як MEDIUM
        const species = mapSpecies(input.pet.species);
        if (species && input.pet.size) {
            const surcharge = await this.surchargesRepo.findByOfferingAndSize(
                offeringId,
                species,
                input.pet.size,
            );
            if (surcharge) {
                total += Number(surcharge.surchargeAmount);
            }
        }

        if (input.addonIds.length > 0) {
            const addons = await this.addonsRepo.findByIds(input.addonIds);
            if (addons.length !== input.addonIds.length) {
                throw new BadRequestException('Один або більше addon-ів не знайдено');
            }
            for (const a of addons) {
                if (a.serviceOfferingId !== offeringId) {
                    throw new BadRequestException(
                        `Addon ${a.id} належить іншому offering`,
                    );
                }
                const multiplier = this.addonMultiplier(
                    a.priceUnit,
                    input.scheduledStart,
                    input.scheduledEnd,
                );
                total += Number(a.price) * multiplier;
            }
        }

        return {
            price: Math.round(total * 100) / 100,
            serviceOfferingId: offeringId,
        };
    }

    private addonMultiplier(
        unit: AddonPriceUnit,
        start: Date,
        end: Date,
    ): number {
        if (unit === AddonPriceUnit.PER_BOOKING) return 1;
        if (unit === AddonPriceUnit.PER_DAY) {
            const ms = end.getTime() - start.getTime();
            return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
        }
        // PER_WALK — точна кількість прогулянок невідома при створенні booking-а;
        // рахуємо як одну (для PER_WALK addons вартість оновлюється сегментами).
        return 1;
    }
}

// Повертає DayType для дати. HOLIDAY перевіряється першим (свято в суботу
// все одно лишається HOLIDAY), потім WEEKEND, інакше REGULAR.
function getDayType(date: Date): DayType {
    if (isUkrainianHoliday(date)) return DayType.HOLIDAY;
    const day = date.getDay();
    if (day === 0 || day === 6) return DayType.WEEKEND;
    return DayType.REGULAR;
}

// Повертає по одній даті на кожну розпочату добу (24 год) booking-а, починаючи
// з дати start — та сама кількість днів, що й ceil(ms / 24h) у addonMultiplier
// та в клієнтському розрахунку. Дати — на 00:00 локального часу, щоб DayType
// визначався за календарним днем, у який починається кожна доба.
function listDaysInRange(start: Date, end: Date): Date[] {
    const ms = end.getTime() - start.getTime();
    const count = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    const result: Date[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    for (let i = 0; i < count; i++) {
        result.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return result;
}

function mapSpecies(value: string | null): 'DOG' | 'CAT' | null {
    if (!value) return null;
    const v = value.toLowerCase();
    if (v === 'dog') return 'DOG';
    if (v === 'cat') return 'CAT';
    return null;
}
