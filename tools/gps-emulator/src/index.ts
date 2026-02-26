import { io, Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GpsPoint {
    lat: number;
    lng: number;
    speed?: number;
    altitude?: number;
}

interface ActionMarker {
    action: 'start-walk' | 'end-walk';
}

type ScenarioEntry = GpsPoint | ActionMarker;

// ─── CLI argument parsing ─────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(name: string, defaultVal?: string): string {
    const idx = args.indexOf(`--${name}`);
    if (idx !== -1) return args[idx + 1];
    if (defaultVal !== undefined) return defaultVal;
    console.error(`Missing required argument: --${name}`);
    process.exit(1);
}

const sessionId  = getArg('session');
const scenario   = getArg('scenario', 'park-walk');
const intervalMs = parseInt(getArg('interval', '3000'), 10);
const serverUrl  = getArg('url', 'http://localhost:3000');
const token      = getArg('token', '');

// ─── Load scenario ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const points: ScenarioEntry[] = require(`./scenarios/${scenario}.json`);
const totalGps = points.filter((p): p is GpsPoint => 'lat' in p).length;

console.log('\n🐾 GPS Emulator');
console.log(`   Session:  ${sessionId}`);
console.log(`   Scenario: ${scenario} (${totalGps} GPS points + ${points.length - totalGps} actions)`);
console.log(`   Interval: ${intervalMs}ms`);
console.log(`   Server:   ${serverUrl}`);
if (!token) console.log('No --token provided — start-walk/end-walk actions will be skipped\n');
else console.log('Token:    provided\n');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

async function callRest(method: string, path: string): Promise<{ id: string } | null> {
    if (!token) {
        console.log(`Skipping ${method} ${path} (no --token)`);
        return null;
    }
    const res = await fetch(`${serverUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        console.error(`${method} ${path} → HTTP ${res.status}`);
        return null;
    }
    return res.json() as Promise<{ id: string }>;
}

// ─── WebSocket connection ─────────────────────────────────────────────────────

const socket: Socket = io(`${serverUrl}/tracking`, { transports: ['websocket'] });

socket.on('connect', () => {
    console.log(`Connected to WebSocket (${socket.id})\n`);
    runScenario().then(() => process.exit(0));
});

socket.on('tracking:geofence-alert', (data: { lat: number; lng: number }) => {
    console.log(`\nGEOFENCE ALERT: pet at (${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}) is outside safe zone!\n`);
});

socket.on('connect_error', (err: Error) => {
    console.error(`Connection failed: ${err.message}`);
    process.exit(1);
});

// ─── Scenario runner ──────────────────────────────────────────────────────────

async function runScenario(): Promise<void> {
    let gpsCount = 0;
    let activeSegmentId: string | null = null;

    for (const point of points) {
        if ('action' in point) {
            if (point.action === 'start-walk') {
                const result = await callRest('POST', `/tracking/sessions/${sessionId}/walk-segments`);
                if (result) {
                    activeSegmentId = result.id;
                    console.log(`Walk started: ${activeSegmentId}`);
                }
            } else if (point.action === 'end-walk' && activeSegmentId) {
                await callRest('PATCH', `/tracking/walk-segments/${activeSegmentId}/complete`);
                console.log('Walk ended');
                activeSegmentId = null;
            }
        } else {
            socket.emit('tracking:send-point', {
                sessionId,
                lat: point.lat,
                lng: point.lng,
                altitude: point.altitude ?? null,
                speed: point.speed ?? null,
                timestamp: new Date().toISOString(),
            });
            gpsCount++;
            console.log(`[${gpsCount}/${totalGps}] lat=${point.lat} lng=${point.lng}` +
                (point.speed ? ` speed=${point.speed}m/s` : ''));
        }

        await sleep(intervalMs);
    }

    console.log(`\nDone! ${gpsCount} GPS points sent.`);
    socket.disconnect();
}
