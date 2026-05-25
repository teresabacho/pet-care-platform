import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaItem } from './entities/media-item.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaRepository } from './media.repository';
import { ImageProcessor } from './processors/image.processor';
import { UsersModule } from '../users/users.module';
import { PetsModule } from '../pets/pets.module';

@Module({
    imports: [TypeOrmModule.forFeature([MediaItem]), UsersModule, PetsModule],
    controllers: [MediaController],
    providers: [MediaService, MediaRepository, ImageProcessor],
    exports: [MediaService, MediaRepository],
})
export class MediaModule {}
