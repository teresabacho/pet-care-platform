import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { MessageMediaItem } from './entities/message-media-item.entity';
import { User } from '../auth/entities/user.entity';
import { MediaItem } from '../media/entities/media-item.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRepository } from './chat.repository';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Conversation,
            Message,
            MessageMediaItem,
            User,
            MediaItem,
        ]),
        AuthModule,
        MediaModule,
    ],
    controllers: [ChatController],
    providers: [ChatService, ChatRepository, ChatGateway],
    exports: [ChatService, ChatGateway],
})
export class ChatModule {}
