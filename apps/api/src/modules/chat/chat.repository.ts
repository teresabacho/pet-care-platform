import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { MessageType } from '@pet-care/shared';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { MessageMediaItem } from './entities/message-media-item.entity';

// Нормалізація пари учасників: завжди (min, max) за UUID-порядком.
function normalizePair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
}

@Injectable()
export class ChatRepository {
    constructor(
        @InjectRepository(Conversation)
        private readonly conversationRepo: Repository<Conversation>,
        @InjectRepository(Message)
        private readonly messageRepo: Repository<Message>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async findOrCreateConversation(
        userAId: string,
        userBId: string,
    ): Promise<Conversation> {
        const [a, b] = normalizePair(userAId, userBId);
        const existing = await this.conversationRepo.findOne({
            where: { participantAId: a, participantBId: b },
        });
        if (existing) return existing;

        const entity = this.conversationRepo.create({
            participantAId: a,
            participantBId: b,
        });
        try {
            return await this.conversationRepo.save(entity);
        } catch {
            // race-condition: інша транзакція могла створити паралельно — повторно прочитаємо.
            const after = await this.conversationRepo.findOne({
                where: { participantAId: a, participantBId: b },
            });
            if (!after) throw new Error('Failed to create conversation');
            return after;
        }
    }

    findById(id: string): Promise<Conversation | null> {
        return this.conversationRepo.findOne({ where: { id } });
    }

    // Список conversations для юзера (де він — A або B), з last message та unread count.
    // Використовуємо raw query з LATERAL JOIN — швидший за окремі subquery-и.
    async findByParticipant(userId: string): Promise<
        Array<{
            conversation: Conversation;
            lastMessage: Message | null;
            unreadCount: number;
        }>
    > {
        const rows = await this.dataSource.query<
            Array<{
                conv_id: string;
                conv_participant_a_id: string;
                conv_participant_b_id: string;
                conv_last_message_at: Date | null;
                conv_created_at: Date;
                last_msg_id: string | null;
                last_msg_conversation_id: string | null;
                last_msg_sender_id: string | null;
                last_msg_message_type: MessageType | null;
                last_msg_text: string | null;
                last_msg_read_at: Date | null;
                last_msg_created_at: Date | null;
                unread_count: string;
            }>
        >(
            `SELECT
                c.id                  AS conv_id,
                c.participant_a_id    AS conv_participant_a_id,
                c.participant_b_id    AS conv_participant_b_id,
                c.last_message_at     AS conv_last_message_at,
                c.created_at          AS conv_created_at,
                lm.id                 AS last_msg_id,
                lm.conversation_id    AS last_msg_conversation_id,
                lm.sender_id          AS last_msg_sender_id,
                lm.message_type       AS last_msg_message_type,
                lm.text               AS last_msg_text,
                lm.read_at            AS last_msg_read_at,
                lm.created_at         AS last_msg_created_at,
                (
                    SELECT COUNT(*) FROM messages m
                    WHERE m.conversation_id = c.id
                      AND m.sender_id <> $1
                      AND m.read_at IS NULL
                ) AS unread_count
             FROM conversations c
             LEFT JOIN LATERAL (
                SELECT * FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC
                LIMIT 1
             ) lm ON TRUE
             WHERE c.participant_a_id = $1 OR c.participant_b_id = $1
             ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
            [userId],
        );

        return rows.map((r) => {
            const conversation: Conversation = {
                id: r.conv_id,
                participantAId: r.conv_participant_a_id,
                participantBId: r.conv_participant_b_id,
                participantA: undefined as never,
                participantB: undefined as never,
                lastMessageAt: r.conv_last_message_at,
                createdAt: r.conv_created_at,
            };
            const lastMessage: Message | null = r.last_msg_id
                ? ({
                      id: r.last_msg_id,
                      conversationId: r.last_msg_conversation_id!,
                      conversation: undefined as never,
                      senderId: r.last_msg_sender_id!,
                      sender: undefined as never,
                      messageType: r.last_msg_message_type!,
                      text: r.last_msg_text,
                      readAt: r.last_msg_read_at,
                      createdAt: r.last_msg_created_at!,
                      mediaItems: [],
                  } as Message)
                : null;
            return {
                conversation,
                lastMessage,
                unreadCount: parseInt(r.unread_count, 10),
            };
        });
    }

    async findMessagesPaginated(
        conversationId: string,
        cursor: string | null,
        limit: number,
    ): Promise<Message[]> {
        // Cursor — id найстарішого вже завантаженого; повертаємо ще старіші.
        // Сортування DESC, але повертаємо «найновіші зверху» — клієнт може реверснути для рендеру.
        const qb = this.messageRepo
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.mediaItems', 'mmi')
            .leftJoinAndSelect('mmi.mediaItem', 'mi')
            .where('m.conversationId = :id', { id: conversationId })
            .orderBy('m.createdAt', 'DESC')
            .addOrderBy('m.id', 'DESC')
            .take(limit);

        if (cursor) {
            const cursorMsg = await this.messageRepo.findOne({
                where: { id: cursor },
            });
            if (cursorMsg) {
                qb.andWhere(
                    '(m.createdAt, m.id) < (:cursorCreatedAt, :cursorId)',
                    { cursorCreatedAt: cursorMsg.createdAt, cursorId: cursor },
                );
            }
        }
        return qb.getMany();
    }

    async markMessagesRead(
        conversationId: string,
        readerId: string,
    ): Promise<string[]> {
        const unread = await this.messageRepo.find({
            where: {
                conversationId,
                readAt: IsNull(),
            },
            select: ['id', 'senderId'],
        });
        const toMarkIds = unread
            .filter((m) => m.senderId !== readerId)
            .map((m) => m.id);
        if (toMarkIds.length === 0) return [];

        await this.messageRepo
            .createQueryBuilder()
            .update(Message)
            .set({ readAt: () => 'NOW()' })
            .whereInIds(toMarkIds)
            .execute();
        return toMarkIds;
    }

    async getUnreadCount(userId: string): Promise<number> {
        const row = await this.messageRepo
            .createQueryBuilder('m')
            .innerJoin(
                'conversations',
                'c',
                'c.id = m.conversationId AND (c.participant_a_id = :u OR c.participant_b_id = :u)',
                { u: userId },
            )
            .where('m.senderId <> :u', { u: userId })
            .andWhere('m.readAt IS NULL')
            .select('COUNT(*)', 'count')
            .getRawOne<{ count: string }>();
        return row ? parseInt(row.count, 10) : 0;
    }

    async appendMessage(
        conversationId: string,
        senderId: string,
        messageType: MessageType,
        text: string | null,
        mediaItemIds: string[] = [],
    ): Promise<Message> {
        return this.dataSource.transaction(async (manager) => {
            const message = manager.create(Message, {
                conversationId,
                senderId,
                messageType,
                text,
            });
            const saved = await manager.save(Message, message);

            if (mediaItemIds.length > 0) {
                const items = mediaItemIds.map((mid, idx) =>
                    manager.create(MessageMediaItem, {
                        messageId: saved.id,
                        mediaItemId: mid,
                        orderIndex: idx,
                    }),
                );
                await manager.save(MessageMediaItem, items);
            }

            await manager.update(
                Conversation,
                { id: conversationId },
                { lastMessageAt: saved.createdAt },
            );

            const reloaded = await manager.findOne(Message, {
                where: { id: saved.id },
                relations: ['mediaItems', 'mediaItems.mediaItem'],
            });
            return reloaded!;
        });
    }

    // Helper для permission-checks: чи user є учасником conversation.
    async isParticipant(conversationId: string, userId: string): Promise<boolean> {
        const conv = await this.conversationRepo.findOne({
            where: { id: conversationId },
        });
        if (!conv) return false;
        return conv.participantAId === userId || conv.participantBId === userId;
    }

    // For socket gateway: список conversation IDs для join.
    async findConversationIdsByParticipant(userId: string): Promise<string[]> {
        const rows = await this.conversationRepo.find({
            where: [{ participantAId: userId }, { participantBId: userId }],
            select: ['id'],
        });
        return rows.map((r) => r.id);
    }

}
