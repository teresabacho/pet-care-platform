import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('certificates')
@Controller('caretaker-profile')
export class CertificatesController {
    constructor(private readonly certificatesService: CertificatesService) {}

    @Post('certificates')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Створити сертифікат на основі завантаженого MediaItem' })
    @ApiResponse({ status: 201 })
    @ApiResponse({ status: 400, description: 'MediaItem не належить цьому типу' })
    @ApiResponse({ status: 403, description: 'MediaItem не ваш' })
    @ApiResponse({ status: 404, description: 'Профіль або MediaItem не знайдено' })
    @ApiResponse({ status: 409, description: 'Перевищено ліміт сертифікатів' })
    create(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateCertificateDto,
    ) {
        return this.certificatesService.create(userId, dto);
    }

    @Get(':caretakerProfileId/certificates')
    @ApiOperation({ summary: 'Список сертифікатів caretaker-а (публічний)' })
    @ApiResponse({ status: 200 })
    list(@Param('caretakerProfileId', ParseUUIDPipe) caretakerProfileId: string) {
        return this.certificatesService.findByCaretakerProfileId(caretakerProfileId);
    }

    @Delete('certificates/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(204)
    @ApiOperation({ summary: 'Видалити власний сертифікат' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 403, description: 'Не ваш сертифікат' })
    @ApiResponse({ status: 404, description: 'Сертифікат не знайдено' })
    delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.certificatesService.delete(id, userId);
    }
}
