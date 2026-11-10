import { AddonPriceUnit, DayType, PriceUnit } from '@pet-care/shared';
import { BookingPricingService } from './booking-pricing.service';

// Тест без DI — подаємо мінімальні стаби репозиторіїв.
describe('BookingPricingService.calculate', () => {
    function buildService(opts: {
        tier: { id: string; serviceOfferingId: string; basePrice: number; priceUnit: PriceUnit; durationMinutes: number | null };
        extraTiers?: Array<{ id: string; serviceOfferingId: string; basePrice: number; priceUnit: PriceUnit; durationMinutes: number | null; dayType: DayType }>;
        surcharge?: { surchargeAmount: number };
        addons?: Array<{ id: string; serviceOfferingId: string; price: number; priceUnit: AddonPriceUnit }>;
    }) {
        const tiersRepo = {
            findById: async () => opts.tier,
            findByOfferingId: async () => [opts.tier, ...(opts.extraTiers ?? [])],
        } as never;
        const surchargesRepo = {
            findByOfferingAndSize: async () => opts.surcharge ?? null,
        } as never;
        const addonsRepo = {
            findByIds: async (ids: string[]) =>
                (opts.addons ?? []).filter((a) => ids.includes(a.id)),
        } as never;
        return new BookingPricingService(tiersRepo, surchargesRepo, addonsRepo);
    }

    const dummyPet: { id: string; species: string; size: string } = {
        id: 'p',
        species: 'dog',
        size: 'MEDIUM',
    };
    const start = new Date('2026-03-01T10:00:00Z');
    const end = new Date('2026-03-01T11:00:00Z');

    it('returns basePrice for MEDIUM with no addons', async () => {
        const svc = buildService({
            tier: { id: 't', serviceOfferingId: 'o', basePrice: 200, priceUnit: PriceUnit.PER_SESSION, durationMinutes: 60 },
        });
        const r = await svc.calculate({
            tierId: 't',
            addonIds: [],
            pet: dummyPet as never,
            scheduledStart: start,
            scheduledEnd: end,
        });
        expect(r.price).toBe(200);
    });

    it('adds size surcharge', async () => {
        const svc = buildService({
            tier: { id: 't', serviceOfferingId: 'o', basePrice: 200, priceUnit: PriceUnit.PER_SESSION, durationMinutes: null },
            surcharge: { surchargeAmount: 50 },
        });
        const r = await svc.calculate({
            tierId: 't',
            addonIds: [],
            pet: { ...dummyPet, size: 'LARGE' } as never,
            scheduledStart: start,
            scheduledEnd: end,
        });
        expect(r.price).toBe(250);
    });

    it('adds PER_BOOKING addons once', async () => {
        const svc = buildService({
            tier: { id: 't', serviceOfferingId: 'o', basePrice: 200, priceUnit: PriceUnit.PER_SESSION, durationMinutes: null },
            addons: [{ id: 'a1', serviceOfferingId: 'o', price: 50, priceUnit: AddonPriceUnit.PER_BOOKING }],
        });
        const r = await svc.calculate({
            tierId: 't',
            addonIds: ['a1'],
            pet: dummyPet as never,
            scheduledStart: start,
            scheduledEnd: end,
        });
        expect(r.price).toBe(250);
    });

    it('multiplies PER_DAY addons by ceil(days)', async () => {
        const svc = buildService({
            tier: { id: 't', serviceOfferingId: 'o', basePrice: 500, priceUnit: PriceUnit.PER_DAY, durationMinutes: null },
            addons: [{ id: 'a1', serviceOfferingId: 'o', price: 100, priceUnit: AddonPriceUnit.PER_DAY }],
        });
        const r = await svc.calculate({
            tierId: 't',
            addonIds: ['a1'],
            pet: dummyPet as never,
            scheduledStart: new Date('2026-03-01T10:00:00Z'),
            scheduledEnd: new Date('2026-03-04T10:00:00Z'), // 3 days
        });
        // 3 доби: 500*3 base + 100*3 addon. Березень 1 — неділя, але WEEKEND-tier
        // не налаштований, тож застосовується базовий.
        expect(r.price).toBe(1800);
    });

    it('charges PER_DAY base per started 24h period, not per calendar date touched', async () => {
        const svc = buildService({
            tier: { id: 't', serviceOfferingId: 'o', basePrice: 500, priceUnit: PriceUnit.PER_DAY, durationMinutes: null },
        });
        const r = await svc.calculate({
            tierId: 't',
            addonIds: [],
            pet: dummyPet as never,
            // Ніч з вівторка на середу — 10 год, дві календарні дати
            scheduledStart: new Date(2026, 2, 3, 22, 0),
            scheduledEnd: new Date(2026, 2, 4, 8, 0),
        });
        expect(r.price).toBe(500);
    });

    it('applies WEEKEND tier to weekend days of a PER_DAY booking', async () => {
        const svc = buildService({
            tier: { id: 't', serviceOfferingId: 'o', basePrice: 400, priceUnit: PriceUnit.PER_DAY, durationMinutes: null },
            extraTiers: [
                { id: 'tw', serviceOfferingId: 'o', basePrice: 600, priceUnit: PriceUnit.PER_DAY, durationMinutes: null, dayType: DayType.WEEKEND },
            ],
        });
        const r = await svc.calculate({
            tierId: 't',
            addonIds: [],
            pet: dummyPet as never,
            // П'ятниця 18:00 → неділя 18:00 = 2 доби: пт (REGULAR) + сб (WEEKEND)
            scheduledStart: new Date(2026, 2, 6, 18, 0),
            scheduledEnd: new Date(2026, 2, 8, 18, 0),
        });
        expect(r.price).toBe(1000);
    });

    it('prefers HOLIDAY tier over WEEKEND and REGULAR', async () => {
        const svc = buildService({
            tier: { id: 't', serviceOfferingId: 'o', basePrice: 400, priceUnit: PriceUnit.PER_DAY, durationMinutes: null },
            extraTiers: [
                { id: 'tw', serviceOfferingId: 'o', basePrice: 600, priceUnit: PriceUnit.PER_DAY, durationMinutes: null, dayType: DayType.WEEKEND },
                { id: 'th', serviceOfferingId: 'o', basePrice: 800, priceUnit: PriceUnit.PER_DAY, durationMinutes: null, dayType: DayType.HOLIDAY },
            ],
        });
        const r = await svc.calculate({
            tierId: 't',
            addonIds: [],
            pet: dummyPet as never,
            // Нд 23.08 (WEEKEND) + пн 24.08 — День Незалежності (HOLIDAY) + вт 25.08 (REGULAR)
            scheduledStart: new Date(2026, 7, 23, 10, 0),
            scheduledEnd: new Date(2026, 7, 26, 10, 0),
        });
        expect(r.price).toBe(1800); // 600 + 800 + 400
    });

    it('applies WEEKEND tier to a PER_SESSION booking by its start date', async () => {
        const svc = buildService({
            tier: { id: 't', serviceOfferingId: 'o', basePrice: 200, priceUnit: PriceUnit.PER_SESSION, durationMinutes: 60 },
            extraTiers: [
                { id: 'tw', serviceOfferingId: 'o', basePrice: 260, priceUnit: PriceUnit.PER_SESSION, durationMinutes: 30, dayType: DayType.WEEKEND },
                { id: 'tw60', serviceOfferingId: 'o', basePrice: 300, priceUnit: PriceUnit.PER_SESSION, durationMinutes: 60, dayType: DayType.WEEKEND },
            ],
        });
        const r = await svc.calculate({
            tierId: 't',
            addonIds: [],
            pet: dummyPet as never,
            scheduledStart: new Date(2026, 2, 7, 10, 0), // субота
            scheduledEnd: new Date(2026, 2, 7, 11, 0),
        });
        expect(r.price).toBe(300); // weekend-tier тієї ж тривалості (60 хв)
    });
});
