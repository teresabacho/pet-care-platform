import { AddonPriceUnit, PriceUnit } from '@pet-care/shared';
import { BookingPricingService } from './booking-pricing.service';

// Тест без DI — подаємо мінімальні стаби репозиторіїв.
describe('BookingPricingService.calculate', () => {
    function buildService(opts: {
        tier: { id: string; serviceOfferingId: string; basePrice: number; priceUnit: PriceUnit; durationMinutes: number | null };
        surcharge?: { surchargeAmount: number };
        addons?: Array<{ id: string; serviceOfferingId: string; price: number; priceUnit: AddonPriceUnit }>;
    }) {
        const tiersRepo = {
            findById: async () => opts.tier,
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
        expect(r.price).toBe(800); // 500 + 100*3
    });
});
