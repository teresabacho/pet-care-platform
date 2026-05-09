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
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateServiceOfferingDto } from './dto/create-service-offering.dto';
import { UpdateServiceOfferingDto } from './dto/update-service-offering.dto';
import { SearchServicesDto } from './dto/search-services.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('services')
@Controller('services')
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Створити offering із tiers/surcharges/addons/policy за один запит',
    })
    @ApiResponse({ status: 201, description: 'Послугу створено' })
    @ApiResponse({ status: 400, description: 'Невалідний запит' })
    @ApiResponse({ status: 404, description: 'Профіль виконавця не знайдено' })
    @ApiResponse({ status: 409, description: 'Послуга такого типу вже існує' })
    create(@Request() req: { user: User }, @Body() dto: CreateServiceOfferingDto) {
        return this.servicesService.create(req.user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Пошук послуг (з геофільтрацією)' })
    @ApiResponse({ status: 200, description: 'Список послуг' })
    search(@Query() dto: SearchServicesDto) {
        return this.servicesService.search(dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Деталі offering з усіма залежностями' })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 404 })
    findById(@Param('id', ParseUUIDPipe) id: string) {
        return this.servicesService.findById(id);
    }

    @Get('caretaker/:userId')
    @ApiOperation({ summary: 'Всі послуги конкретного виконавця' })
    @ApiResponse({ status: 200, description: 'Список послуг виконавця' })
    @ApiResponse({ status: 404, description: 'Профіль виконавця не знайдено' })
    findByCaretaker(@Param('userId') userId: string) {
        return this.servicesService.findByCaretaker(userId);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary:
            'Оновити offering — diff-replace tiers/surcharges/addons/policy у транзакції',
    })
    @ApiResponse({ status: 200, description: 'Послугу оновлено' })
    @ApiResponse({ status: 400, description: 'Невалідний запит або не ваша послуга' })
    @ApiResponse({ status: 404, description: 'Послугу не знайдено' })
    @ApiResponse({
        status: 409,
        description: 'Тариф використовується в існуючому замовленні',
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: { user: User },
        @Body() dto: UpdateServiceOfferingDto,
    ) {
        return this.servicesService.update(id, req.user.id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(204)
    @ApiOperation({ summary: 'Видалити offering (каскадно: tiers/surcharges/addons/policy)' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 400, description: 'Це не ваша послуга' })
    @ApiResponse({ status: 404 })
    @ApiResponse({ status: 409, description: 'На послугу є замовлення — видалити не можна' })
    delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: User }) {
        return this.servicesService.delete(id, req.user.id);
    }
}
