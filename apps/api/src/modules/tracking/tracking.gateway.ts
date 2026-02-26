import {
    ConnectedSocket, MessageBody, OnGatewayConnection,
    SubscribeMessage, WebSocketGateway, WebSocketServer, WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { GeoService } from '../geo/geo.service';
import { SendPointDto } from './dto/send-point.dto';
import { TrackingSessionStatus } from '@pet-care/shared';

@WebSocketGateway({ namespace: '/tracking', cors: { origin: '*' } })
export class TrackingGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly trackingService: TrackingService,
        private readonly geoService: GeoService,
    ) {}

    handleConnection(client: Socket) {
        console.log(`WS client connected: ${client.id}`);
    }

    @SubscribeMessage('tracking:subscribe')
    async handleSubscribe(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ) {
        await client.join(`session:${data.sessionId}`);
        client.emit('tracking:subscribed', { sessionId: data.sessionId });
    }

    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    @SubscribeMessage('tracking:send-point')
    async handleSendPoint(
        @MessageBody() dto: SendPointDto,
        @ConnectedSocket() client: Socket,
    ) {
        const session = await this.trackingService.findSessionById(dto.sessionId)
            .catch(() => null);

        if (!session || session.status !== TrackingSessionStatus.ACTIVE) {
            throw new WsException('Tracking session not found or not active');
        }

        const activeSegment = await this.trackingService.findActiveSegmentBySessionId(dto.sessionId);

        await this.trackingService.bufferPoint(dto, activeSegment?.id ?? null);

        // Broadcast live point to subscribed owner
        this.server.to(`session:${dto.sessionId}`).emit('tracking:live-point', {
            lat: dto.lat,
            lng: dto.lng,
            altitude: dto.altitude,
            speed: dto.speed,
            timestamp: dto.timestamp,
            walkSegmentId: activeSegment?.id ?? null,
        });

        // Geofence check: if a geofence exists and the pet is outside — alert the owner
        const isInside = await this.geoService.checkGeofence(dto.lat, dto.lng, dto.sessionId);
        if (!isInside) {
            this.server.to(`session:${dto.sessionId}`).emit('tracking:geofence-alert', {
                sessionId: dto.sessionId,
                lat: dto.lat,
                lng: dto.lng,
                timestamp: dto.timestamp,
            });
        }
    }

    // Called by TrackingController after a new walk segment is created
    emitWalkStarted(sessionId: string, segmentId: string): void {
        this.server.to(`session:${sessionId}`).emit('tracking:walk-started', { sessionId, segmentId });
    }

    // Called by TrackingController after a walk segment is completed
    emitWalkEnded(sessionId: string, segmentId: string): void {
        this.server.to(`session:${sessionId}`).emit('tracking:walk-ended', { sessionId, segmentId });
    }
}
