import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
    MediaBucket,
    MediaItemStatus,
    MediaOwnerType,
    MessageType,
} from '@pet-care/shared';
import { ChatRepository } from './chat.repository';
import { SendMessageDto } from './dto/send-message.dto';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { User } from '../auth/entities/user.entity';
import { MediaItem } from '../media/entities/media-item.entity';
import { MediaService } from '../media/media.service';

export interface ConversationListItem {
    id: string;
    otherParticipant: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        avatarUrl: string | null;
    };
    lastMessage: Message | null;
    unreadCount: number;
    lastMessageAt: Date | null;
    createdAt: Date;
}

@Injectable()
export class ChatService {
    constructor(
        private readonly chatRepo: ChatRepository,
        private readonly mediaService: MediaService,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(MediaItem)
        private readonly mediaRepo: Repository<MediaItem>,
    ) {}

    // Замінює storageKey-URL у MediaItem на свіжий presigned-GET (1 година).
    private async stampPresignedUrls(message: Message): Promise<Message> {
        if (!message.mediaItems || message.mediaItems.length === 0) return message;
        for (const mmi of message.mediaItems) {
            const mi = mmi.mediaItem;
            if (!mi) continue;
            if (mi.bucket === MediaBucket.PRIVATE) {
                const url = await this.mediaService.mintPresignedUrlForKey(
                    mi.storageKey,
                );
                mi.url = url;
                if (mi.thumbnailKey) {
                    mi.thumbnailUrl =
                        await this.mediaService.mintPresignedUrlForKey(
                            mi.thumbnailKey,
                        );
                }
            }
        }
        return message;
    }

    private async stampManyMessages(messages: Message[]): Promise<Message[]> {
        for (const m of messages) {
            await this.stampPresignedUrls(m);
        }
        return messages;
    }

    async startConversation(
        currentUserId: string,
        otherUserId: string,
    ): Promise<Conversation> {
        if (otherUserId === currentUserId) {
            throw new BadRequestException('Не можна почати розмову з самим собою');
        }
        const other = await this.userRepo.findOne({ where: { id: otherUserId } });
        if (!other) {
            throw new NotFoundException('Користувача не знайдено');
        }
        return this.chatRepo.findOrCreateConversation(currentUserId, otherUserId);
    }

    async getConversations(userId: string): Promise<ConversationListItem[]> {
        const rows = await this.chatRepo.findByParticipant(userId);
        if (rows.length === 0) return [];

        const otherIds = rows.map((r) =>
            r.conversation.participantAId === userId
                ? r.conversation.participantBId
                : r.conversation.participantAId,
        );
        const users = await this.userRepo.find({
            where: { id: In(otherIds) },
            select: ['id', 'firstName', 'lastName', 'email', 'avatarUrl'],
        });
        const userById = new Map(users.map((u) => [u.id, u]));

        return rows.map((r) => {
            const otherId =
                r.conversation.participantAId === userId
                    ? r.conversation.participantBId
                    : r.conversation.participantAId;
            const other = userById.get(otherId);
            return {
                id: r.conversation.id,
                otherParticipant: {
                    id: otherId,
                    firstName: other?.firstName ?? null,
                    lastName: other?.lastName ?? null,
                    email: other?.email ?? '',
                    avatarUrl: other?.avatarUrl ?? null,
                },
                lastMessage: r.lastMessage,
                unreadCount: r.unreadCount,
                lastMessageAt: r.conversation.lastMessageAt,
                createdAt: r.conversation.createdAt,
            };
        });
    }

    async getMessages(
        conversationId: string,
        currentUserId: string,
        cursor: string | null,
        limit: number,
    ): Promise<Message[]> {
        await this.assertParticipant(conversationId, currentUserId);
        const rows = await this.chatRepo.findMessagesPaginated(
            conversationId,
            cursor,
            limit,
        );
        return this.stampManyMessages(rows);
    }

    async sendMessage(
        conversationId: string,
        senderId: string,
        dto: SendMessageDto,
    ): Promise<Message> {
        await this.assertParticipant(conversationId, senderId);

        if (dto.messageType === MessageType.TEXT) {
            if (!dto.text || dto.text.trim().length === 0) {
                throw new BadRequestException('Текст повідомлення обов\'язковий');
            }
            const message = await this.chatRepo.appendMessage(
                conversationId,
                senderId,
                MessageType.TEXT,
                dto.text.trim(),
                [],
            );
            return this.stampPresignedUrls(message);
        }

        // MEDIA
        const mediaIds = dto.mediaItemIds ?? [];
        if (mediaIds.length === 0) {
            throw new BadRequestException(
                'Для MEDIA-повідомлення потрібен щонайменше один mediaItemId',
            );
        }
        const items = await this.mediaRepo.find({ where: { id: In(mediaIds) } });
        if (items.length !== mediaIds.length) {
            throw new BadRequestException('Деякі MediaItem не знайдено');
        }
        for (const it of items) {
            if (it.ownerType !== MediaOwnerType.MESSAGE_MEDIA) {
                throw new BadRequestException(
                    'MediaItem має бути типу MESSAGE_MEDIA',
                );
            }
            if (it.status !== MediaItemStatus.READY) {
                throw new BadRequestException(
                    `MediaItem ${it.id} ще не у статусі READY`,
                );
            }
            if (it.uploadedById !== senderId) {
                throw new ForbiddenException(
                    'MediaItem завантажено не вами',
                );
            }
        }
        const message = await this.chatRepo.appendMessage(
            conversationId,
            senderId,
            MessageType.MEDIA,
            dto.text?.trim() || null,
            mediaIds,
        );
        return this.stampPresignedUrls(message);
    }

    async markRead(
        conversationId: string,
        currentUserId: string,
    ): Promise<string[]> {
        await this.assertParticipant(conversationId, currentUserId);
        return this.chatRepo.markMessagesRead(conversationId, currentUserId);
    }

    getUnreadCount(currentUserId: string): Promise<number> {
        return this.chatRepo.getUnreadCount(currentUserId);
    }

    private async assertParticipant(
        conversationId: string,
        userId: string,
    ): Promise<void> {
        const conv = await this.chatRepo.findById(conversationId);
        if (!conv) {
            throw new NotFoundException('Розмову не знайдено');
        }
        if (conv.participantAId !== userId && conv.participantBId !== userId) {
            throw new ForbiddenException('Ви не учасник цієї розмови');
        }
    }
}
