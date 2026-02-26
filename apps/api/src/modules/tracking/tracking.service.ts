import {BadRequestException, ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {Cron, Interval} from '@nestjs/schedule';
import {ConfigService} from '@nestjs/config';
import {InjectRedis} from '../../common/decorators/inject-redis.decorator';
import Redis from 'ioredis';
import {TrackingRepository} from './tracking.repository';
import {TrackingSession} from './entities/tracking-session.entity';
import {WalkSegment} from './entities/walk-segment.entity';
import {TrackPoint} from './entities/track-point.entity';
import {SendPointDto} from './dto/send-point.dto';
import {TrackingSessionStatus, WalkSegmentStatus} from '@pet-care/shared';

@Injectable()
export class TrackingService {
    constructor(
        private readonly trackingRepository: TrackingRepository,
        private readonly configService: ConfigService,
        @InjectRedis() private readonly redis: Redis,
    ) {}

    // TrackingSession is created when both parties confirm handover (Phase 3.5)
    // WalkSegments are always created manually by the caretaker regardless of service type
    async createSession(bookingId: string): Promise<TrackingSession> {
        const session = await this.trackingRepository.createSession(bookingId);
        if (!session) return;
        return session;
    }

    async completeSession(bookingId: string): Promise<void> {
        const session = await this.trackingRepository.findSessionByBookingId(bookingId);
        if (!session) return;

        const openSegments = await this.trackingRepository.findActiveSegmentsBySessionId(session.id);
        for (const segment of openSegments) {
            const distance = await this.trackingRepository.computeSegmentDistance(segment.id);
            await this.trackingRepository.completeSegment(segment.id, distance);
        }

        await this.trackingRepository.updateSessionStatus(session.id, TrackingSessionStatus.COMPLETED, new Date());
    }

    async cancelSession(bookingId: string): Promise<void> {
        const session = await this.trackingRepository.findSessionByBookingId(bookingId);
        if (!session) return;
        await this.trackingRepository.updateSessionStatus(session.id, TrackingSessionStatus.CANCELLED, new Date());
    }

    async startWalkSegment(sessionId: string, caretakerId: string): Promise<WalkSegment> {
        const session = await this.trackingRepository.findSessionById(sessionId);
        if (!session) throw new NotFoundException('Сесію трекінгу не знайдено');
        if (session.status !== TrackingSessionStatus.ACTIVE) {
            throw new BadRequestException('Сесія трекінгу не активна');
        }

        const booking = session.booking;
        if (booking.caretakerId !== caretakerId) {
            throw new BadRequestException('Доступ заборонено: ви не є виконавцем цього букінгу');
        }

        const existing = await this.trackingRepository.findActiveSegmentBySessionId(sessionId);
        if (existing) throw new ConflictException('Активна прогулянка вже існує');

        return this.trackingRepository.createWalkSegment(sessionId);
    }

    async completeWalkSegment(segmentId: string, caretakerId: string): Promise<WalkSegment> {
        const segment = await this.trackingRepository.findSegmentById(segmentId);
        if (!segment) throw new NotFoundException('Прогулянку не знайдено');
        if (segment.status !== WalkSegmentStatus.ACTIVE) {
            throw new BadRequestException('Прогулянка вже завершена');
        }

        const distance = await this.trackingRepository.computeSegmentDistance(segmentId);
        await this.trackingRepository.completeSegment(segmentId, distance);
        return this.trackingRepository.findSegmentById(segmentId) as Promise<WalkSegment>;
    }

    async getSessionByBookingId(bookingId: string): Promise<{ session: TrackingSession; segments: WalkSegment[] }> {
        const session = await this.trackingRepository.findSessionByBookingId(bookingId);
        if (!session) throw new NotFoundException('Сесію трекінгу не знайдено');
        const segments = await this.trackingRepository.findSegmentsBySessionId(session.id);
        return { session, segments };
    }

    async getPoints(sessionId: string, segmentId?: string): Promise<TrackPoint[]> {
        return this.trackingRepository.findPointsBySessionId(sessionId, segmentId);
    }

    // Called by WebSocket gateway: buffer point in Redis
    async bufferPoint(dto: SendPointDto, walkSegmentId: string | null): Promise<void> {
        const key = `tracking:buffer:${dto.sessionId}`;
        const point = JSON.stringify({
            sessionId: dto.sessionId,
            walkSegmentId,
            lat: dto.lat,
            lng: dto.lng,
            altitude: dto.altitude ?? null,
            speed: dto.speed ?? null,
            timestamp: dto.timestamp,
        });
        await this.redis.rpush(key, point);
    }

    // Flush all buffered points from Redis into PostgreSQL every 10 seconds
    @Interval(10000)
    async flushPointBuffer(): Promise<void> {
        const keys = await this.redis.keys('tracking:buffer:*');
        for (const key of keys) {
            const raw = await this.redis.lrange(key, 0, -1);
            if (raw.length === 0) continue;
            await this.redis.del(key);

            const points = raw.map(r => {
                const p = JSON.parse(r);
                return { ...p, timestamp: new Date(p.timestamp) };
            });

            await this.trackingRepository.insertPoints(points);
        }
    }

    // Delete background GPS points (walkSegmentId = NULL) older than TTL every hour
    @Cron('0 * * * *')
    async cleanupOldBackgroundPoints(): Promise<void> {
        const ttlHours = this.configService.get<number>('BACKGROUND_POINTS_TTL_HOURS', 12);
        await this.trackingRepository.deleteOldBackgroundPoints(ttlHours);
    }

    // Used by gateway to find active walk segment when routing incoming points
    findActiveSegmentBySessionId(sessionId: string): Promise<WalkSegment | null> {
        return this.trackingRepository.findActiveSegmentBySessionId(sessionId);
    }

    findSessionById(id: string): Promise<TrackingSession | null> {
        return this.trackingRepository.findSessionById(id);
    }

    findSessionByBookingId(bookingId: string): Promise<TrackingSession | null> {
        return this.trackingRepository.findSessionByBookingId(bookingId);
    }
}
