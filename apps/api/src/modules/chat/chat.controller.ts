import {
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    HttpCode,
    Param,
    ParseIntPipe,
    ParseUUIDPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { StartConversationDto } from './dto/start-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly chatGateway: ChatGateway,
    ) {}

    @Post('conversations')
    @ApiOperation({ summary: 'Знайти або створити розмову з користувачем' })
    @ApiResponse({ status: 201 })
    async startConversation(
        @CurrentUser('id') currentUserId: string,
        @Body() dto: StartConversationDto,
    ) {
        const conv = await this.chatService.startConversation(
            currentUserId,
            dto.otherUserId,
        );
        // join обох учасників у кімнату, якщо вони підключені (для нових розмов)
        this.chatGateway.addParticipantsToRoom(conv.id, [
            conv.participantAId,
            conv.participantBId,
        ]);
        return conv;
    }

    @Get('conversations')
    @ApiOperation({ summary: 'Список моїх розмов' })
    @ApiResponse({ status: 200 })
    listConversations(@CurrentUser('id') currentUserId: string) {
        return this.chatService.getConversations(currentUserId);
    }

    @Get('conversations/:id/messages')
    @ApiOperation({
        summary: 'Історія повідомлень розмови (cursor-based pagination)',
    })
    @ApiResponse({ status: 200 })
    listMessages(
        @Param('id', ParseUUIDPipe) conversationId: string,
        @CurrentUser('id') currentUserId: string,
        @Query('cursor') cursor: string | undefined,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    ) {
        return this.chatService.getMessages(
            conversationId,
            currentUserId,
            cursor ?? null,
            Math.min(Math.max(limit, 1), 100),
        );
    }

    @Post('conversations/:id/messages')
    @ApiOperation({ summary: 'Надіслати повідомлення' })
    @ApiResponse({ status: 201 })
    async sendMessage(
        @Param('id', ParseUUIDPipe) conversationId: string,
        @CurrentUser('id') currentUserId: string,
        @Body() dto: SendMessageDto,
    ) {
        const message = await this.chatService.sendMessage(
            conversationId,
            currentUserId,
            dto,
        );
        // broadcast via WebSocket
        this.chatGateway.broadcastMessage(conversationId, message);
        return message;
    }

    @Post('conversations/:id/mark-read')
    @HttpCode(200)
    @ApiOperation({ summary: 'Позначити повідомлення розмови як прочитані' })
    async markRead(
        @Param('id', ParseUUIDPipe) conversationId: string,
        @CurrentUser('id') currentUserId: string,
    ) {
        const markedIds = await this.chatService.markRead(
            conversationId,
            currentUserId,
        );
        if (markedIds.length > 0) {
            this.chatGateway.broadcastRead(
                conversationId,
                currentUserId,
                markedIds,
            );
        }
        return { markedIds };
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Загальна кількість непрочитаних повідомлень' })
    async unreadCount(@CurrentUser('id') currentUserId: string) {
        const count = await this.chatService.getUnreadCount(currentUserId);
        return { count };
    }
}
