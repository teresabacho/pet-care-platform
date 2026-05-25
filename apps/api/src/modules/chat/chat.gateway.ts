import { Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';
import { Message } from './entities/message.entity';

interface AuthedSocket extends Socket {
    data: {
        userId?: string;
    };
}

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    private readonly logger = new Logger(ChatGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwtService: JwtService,
        private readonly chatRepo: ChatRepository,
        private readonly chatService: ChatService,
    ) {}

    async handleConnection(client: AuthedSocket): Promise<void> {
        const token =
            (client.handshake.auth?.token as string | undefined) ??
            (client.handshake.query?.token as string | undefined);
        if (!token) {
            client.disconnect();
            return;
        }
        try {
            const payload = await this.jwtService.verifyAsync<{ sub: string }>(
                token,
            );
            const userId = payload.sub;
            client.data.userId = userId;
            const conversationIds =
                await this.chatRepo.findConversationIdsByParticipant(userId);
            for (const cid of conversationIds) {
                await client.join(`conversation:${cid}`);
            }
            // Особиста кімната — для глобальних подій типу unread-count refresh.
            await client.join(`user:${userId}`);
            client.emit('chat:connected', { userId });
        } catch (err) {
            this.logger.warn(`Chat WS auth failed: ${(err as Error).message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: AuthedSocket): void {
        this.logger.debug(
            `Chat WS disconnected: user=${client.data.userId ?? 'unknown'}`,
        );
    }

    @SubscribeMessage('chat:typing')
    async handleTyping(
        @MessageBody() data: { conversationId: string },
        @ConnectedSocket() client: AuthedSocket,
    ): Promise<void> {
        const userId = client.data.userId;
        if (!userId) return;
        const isParticipant = await this.chatRepo.isParticipant(
            data.conversationId,
            userId,
        );
        if (!isParticipant) return;
        client
            .to(`conversation:${data.conversationId}`)
            .emit('chat:typing', {
                conversationId: data.conversationId,
                userId,
            });
    }

    @SubscribeMessage('chat:mark-read')
    async handleMarkRead(
        @MessageBody() data: { conversationId: string },
        @ConnectedSocket() client: AuthedSocket,
    ): Promise<void> {
        const userId = client.data.userId;
        if (!userId) return;
        const markedIds = await this.chatService.markRead(
            data.conversationId,
            userId,
        );
        if (markedIds.length > 0) {
            this.broadcastRead(data.conversationId, userId, markedIds);
        }
    }

    // ─── Called from ChatController after REST mutations ────────────────────

    broadcastMessage(conversationId: string, message: Message): void {
        this.server
            .to(`conversation:${conversationId}`)
            .emit('chat:message-received', message);
    }

    broadcastRead(
        conversationId: string,
        readerId: string,
        markedIds: string[],
    ): void {
        this.server.to(`conversation:${conversationId}`).emit('chat:message-read', {
            conversationId,
            readerId,
            markedIds,
            readAt: new Date(),
        });
    }

    // Підключити обох учасників до кімнати при створенні нової conversation
    // (їхні сокети могли вже існувати до того як conversation з'явилася).
    addParticipantsToRoom(conversationId: string, participantIds: string[]): void {
        for (const uid of participantIds) {
            const sockets = this.server.in(`user:${uid}`).fetchSockets();
            // fetchSockets() async — обробляємо без await щоб не блокувати controller
            void sockets.then((list) => {
                for (const s of list) {
                    void s.join(`conversation:${conversationId}`);
                }
            });
        }
    }
}
