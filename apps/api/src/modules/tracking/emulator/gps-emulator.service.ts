import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrackingService } from '../tracking.service';
import { TrackingGateway } from '../tracking.gateway';

interface ScenarioPoint {
    lat: number;
    lng: number;
    speed?: number;
    altitude?: number;
}

// Використовуємо CommonJS-require замість ES-default-import. Без esModuleInterop
// дефолтний імпорт JSON компілюється у `.default`, якого немає у require(JSON),
// тому сценарії приходять як undefined і весь емулятор тихо ламається.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const parkWalk: ScenarioPoint[] = require('./scenarios/park-walk.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const streetWalk: ScenarioPoint[] = require('./scenarios/street-walk.json');

const SCENARIOS: Record<string, ScenarioPoint[]> = {
    'park-walk': parkWalk,
    'street-walk': streetWalk,
};

const SCENARIO_NAMES = Object.keys(SCENARIOS);
const TICK_MS = 3000;

interface ActiveEmulation {
    sessionId: string;
    walkSegmentId: string;
    pointIndex: number;
    scenario: ScenarioPoint[];
    timer: NodeJS.Timeout;
}

// In-app симуляція GPS-трекера: коли стартує walk segment, ми емітимо
// точки самі (як зробив би реальний пристрій), щоб можна було тестувати
// весь flow без зовнішнього CLI.
@Injectable()
export class GpsEmulatorService {
    private readonly logger = new Logger(GpsEmulatorService.name);
    private readonly emulations = new Map<string, ActiveEmulation>();
    private readonly enabled: boolean;
    private scenarioRotation = 0;

    constructor(
        @Inject(forwardRef(() => TrackingService))
        private readonly tracking: TrackingService,
        private readonly gateway: TrackingGateway,
        config: ConfigService,
    ) {
        // У продакшені автоемуляція має бути вимкнена. Дефолт — увімкнено,
        // бо це dev-проект з диплому без реального GPS-трекера.
        this.enabled = config.get<string>('ENABLE_GPS_EMULATOR', '1') !== '0';
    }

    start(sessionId: string, walkSegmentId: string): void {
        if (!this.enabled) return;
        // Зупинимо попередню емуляцію цієї сесії, якщо була.
        this.stop(sessionId);

        const scenarioName =
            SCENARIO_NAMES[this.scenarioRotation % SCENARIO_NAMES.length];
        this.scenarioRotation += 1;
        const scenario = SCENARIOS[scenarioName];

        this.logger.log(
            `GPS emulator: start session=${sessionId.slice(0, 8)} segment=${walkSegmentId.slice(0, 8)} scenario=${scenarioName} (${scenario.length} points)`,
        );

        const active: ActiveEmulation = {
            sessionId,
            walkSegmentId,
            pointIndex: 0,
            scenario,
            timer: setInterval(
                () => void this.tick(sessionId),
                TICK_MS,
            ),
        };
        this.emulations.set(sessionId, active);

        // одразу одна точка, щоб клієнт побачив маркер швидко
        void this.tick(sessionId);
    }

    stop(sessionId: string): void {
        const active = this.emulations.get(sessionId);
        if (!active) return;
        clearInterval(active.timer);
        this.emulations.delete(sessionId);
        this.logger.log(`GPS emulator: stop session=${sessionId.slice(0, 8)}`);
    }

    private async tick(sessionId: string): Promise<void> {
        const active = this.emulations.get(sessionId);
        if (!active) return;
        const point = active.scenario[active.pointIndex % active.scenario.length];
        active.pointIndex += 1;

        const timestamp = new Date().toISOString();
        try {
            await this.tracking.bufferPoint(
                {
                    sessionId,
                    lat: point.lat,
                    lng: point.lng,
                    altitude: point.altitude,
                    speed: point.speed,
                    timestamp,
                },
                active.walkSegmentId,
            );
            this.gateway.server
                .to(`session:${sessionId}`)
                .emit('tracking:live-point', {
                    lat: point.lat,
                    lng: point.lng,
                    altitude: point.altitude ?? null,
                    speed: point.speed ?? null,
                    timestamp,
                    walkSegmentId: active.walkSegmentId,
                });
        } catch (err) {
            this.logger.warn(
                `GPS emulator tick failed for ${sessionId}: ${(err as Error).message}`,
            );
        }
    }
}
