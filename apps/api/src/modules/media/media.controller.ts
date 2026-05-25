import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { MediaOwnerType } from '@pet-care/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { UploadImageDto } from './dto/upload-image.dto';
import { RequestPresignedUploadDto } from './dto/request-presigned-upload.dto';
import { ListMediaDto } from './dto/list-media.dto';
import { ReorderMediaDto } from './dto/reorder-media.dto';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
    constructor(private readonly mediaService: MediaService) {}

    @Get()
    @ApiOperation({
        summary: 'Список MediaItem для сутності (тільки READY, у порядку orderIndex)',
    })
    @ApiResponse({ status: 200 })
    list(@Query() dto: ListMediaDto) {
        return this.mediaService.listForOwner(dto.ownerType, dto.ownerId);
    }

    @Patch('reorder')
    @HttpCode(200)
    @ApiOperation({
        summary: 'Перевпорядкувати медіа галереї (orderIndex відповідає індексу в масиві ids)',
    })
    @ApiResponse({ status: 200, description: 'Повертає оновлений список' })
    @ApiResponse({ status: 400, description: 'Невалідні id' })
    @ApiResponse({ status: 403, description: 'Не ваша сутність' })
    reorder(
        @Body() dto: ReorderMediaDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.mediaService.reorder(
            dto.ownerType,
            dto.ownerId,
            dto.ids,
            userId,
        );
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Завантажити зображення (proxy через бекенд)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                ownerType: { type: 'string', enum: Object.values(MediaOwnerType) },
                ownerId: { type: 'string', format: 'uuid' },
            },
            required: ['file', 'ownerType', 'ownerId'],
        },
    })
    @ApiResponse({ status: 201, description: 'MediaItem створено' })
    @ApiResponse({ status: 400, description: 'Невалідний файл або MIME' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Немає прав на upload' })
    @ApiResponse({ status: 409, description: 'Перевищено ліміт елементів' })
    @ApiResponse({ status: 413, description: 'Перевищено ліміт розміру' })
    uploadImage(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UploadImageDto,
        @CurrentUser('id') userId: string,
    ) {
        if (!file) {
            throw new (require('@nestjs/common').BadRequestException)(
                'Поле file обовʼязкове',
            );
        }
        return this.mediaService.uploadImage(
            {
                buffer: file.buffer,
                mimetype: file.mimetype,
                size: file.size,
                originalname: file.originalname,
            },
            dto.ownerType,
            dto.ownerId,
            userId,
        );
    }

    @Post('presigned-upload')
    @ApiOperation({
        summary: 'Запит presigned URL для прямого завантаження відео',
    })
    @ApiResponse({ status: 201, description: 'Повертає uploadUrl та MediaItem' })
    requestPresignedUpload(
        @Body() dto: RequestPresignedUploadDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.mediaService.requestPresignedUpload(
            dto.ownerType,
            dto.ownerId,
            dto.mediaType,
            dto.mimeType,
            dto.sizeBytes,
            userId,
        );
    }

    @Post(':id/confirm')
    @HttpCode(200)
    @ApiOperation({
        summary: 'Підтвердити що файл успішно завантажений у MinIO',
    })
    @ApiResponse({ status: 200, description: 'MediaItem перейшов у READY' })
    @ApiResponse({ status: 400, description: 'Файлу немає у сховищі' })
    @ApiResponse({ status: 404, description: 'MediaItem не знайдено' })
    confirmUpload(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.mediaService.confirmUpload(id, userId);
    }

    @Get(':id/presigned-url')
    @ApiOperation({
        summary: 'Отримати presigned GET URL для приватного файлу',
    })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 400, description: 'Файл публічний' })
    @ApiResponse({ status: 403, description: 'Немає прав' })
    getPresignedDownloadUrl(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.mediaService.getPresignedDownloadUrl(id, userId);
    }

    @Delete('avatar/user/me')
    @HttpCode(204)
    @ApiOperation({ summary: 'Видалити власний аватар (USER_AVATAR)' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 404, description: 'Аватара немає' })
    deleteOwnUserAvatar(@CurrentUser('id') userId: string) {
        return this.mediaService.deleteCurrentAvatar(
            MediaOwnerType.USER_AVATAR,
            userId,
            userId,
        );
    }

    @Delete('avatar/pet/:petId')
    @HttpCode(204)
    @ApiOperation({ summary: 'Видалити аватар тварини' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 403, description: 'Не ваша тварина' })
    @ApiResponse({ status: 404, description: 'Аватара немає' })
    deletePetAvatar(
        @Param('petId', ParseUUIDPipe) petId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.mediaService.deleteCurrentAvatar(
            MediaOwnerType.PET_AVATAR,
            petId,
            userId,
        );
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({ summary: 'Видалити MediaItem' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 403, description: 'Немає прав' })
    @ApiResponse({ status: 404, description: 'Не знайдено' })
    delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.mediaService.delete(id, userId);
    }
}
