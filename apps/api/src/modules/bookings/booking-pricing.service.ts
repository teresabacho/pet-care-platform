import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { AddonPriceUnit, DayType } from '@pet-care/shared';
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

        // Підбираємо найбільш специфічний tier тієї ж тривалості для дати
        // booking-у. HOLIDAY > WEEKEND > REGULAR. Клієнт зазвичай обирає
        // REGULAR-tier у формі бронювання — сервер сам застосує weekend/holiday
        // якщо такий tier налаштований caretaker-ом.
        const tier = await this.resolveTierForDate(initial, input.scheduledStart);

        let total = Number(tier.basePrice);

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

    // ── Day-type aware tier selection ─────────────────────────────────────
    private async resolveTierForDate(
        initial: ServiceTier,
        date: Date,
    ): Promise<ServiceTier> {
        const wanted = getDayType(date);
        if (wanted === DayType.REGULAR) return initial;

        const all = await this.tiersRepo.findByOfferingId(initial.serviceOfferingId);
        const match = all.find(
            (t) =>
                t.durationMinutes === initial.durationMinutes &&
                t.dayType === wanted,
        );
        return match ?? initial;
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

// Повертає DayType для дати. WEEKEND — субота/неділя за локальним часом.
// HOLIDAY поки не визначається автоматично — caretaker може створити tier з
// dayType=HOLIDAY, але без календаря свят booking не «зловить» його. Календар
// свят підключиться окремою задачею.
function getDayType(date: Date): DayType {
    const day = date.getDay();
    if (day === 0 || day === 6) return DayType.WEEKEND;
    return DayType.REGULAR;
}

function mapSpecies(value: string | null): 'DOG' | 'CAT' | null {
    if (!value) return null;
    const v = value.toLowerCase();
    if (v === 'dog') return 'DOG';
    if (v === 'cat') return 'CAT';
    return null;
}
