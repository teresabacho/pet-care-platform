import { GeoService } from './geo.service';

// Pure unit test for obfuscateLocation — exercises only the deterministic offset logic,
// no DB / DI required. The constructor deps aren't touched by this method.
describe('GeoService.obfuscateLocation', () => {
    const service = new GeoService(null as never, null as never);

    const lat = 50.45;
    const lng = 30.52;

    it('produces stable output for the same seed', () => {
        const a = service.obfuscateLocation(lat, lng, 'caretaker-1');
        const b = service.obfuscateLocation(lat, lng, 'caretaker-1');
        expect(a).toEqual(b);
    });

    it('produces different output for different seeds', () => {
        const a = service.obfuscateLocation(lat, lng, 'caretaker-1');
        const b = service.obfuscateLocation(lat, lng, 'caretaker-2');
        expect(a.latitude).not.toEqual(b.latitude);
        expect(a.longitude).not.toEqual(b.longitude);
    });

    it('shifts the point by 200..500 meters (haversine)', () => {
        const result = service.obfuscateLocation(lat, lng, 'seed');
        const distance = haversineMeters(lat, lng, result.latitude, result.longitude);
        expect(distance).toBeGreaterThanOrEqual(199);
        expect(distance).toBeLessThanOrEqual(501);
    });
});

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
