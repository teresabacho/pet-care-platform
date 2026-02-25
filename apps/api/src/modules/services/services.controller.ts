import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateServiceOfferingDto } from './dto/create-service-offering.dto';
import { SearchServicesDto } from './dto/search-services.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('services')
@Controller('services')
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Додати послугу (тільки для виконавців з профілем)' })
    @ApiResponse({ status: 201, description: 'Послугу створено' })
    @ApiResponse({ status: 404, description: 'Профіль виконавця не знайдено' })
    create(@Request() req: { user: User }, @Body() dto: CreateServiceOfferingDto) {
        return this.servicesService.create(req.user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Пошук послуг (з геофільтрацією)' })
    @ApiResponse({ status: 200, description: 'Список послуг' })
    search(@Query() dto: SearchServicesDto) {
        return this.servicesService.search(dto);
    }

    @Get('caretaker/:userId')
    @ApiOperation({ summary: 'Всі послуги конкретного виконавця' })
    @ApiResponse({ status: 200, description: 'Список послуг виконавця' })
    @ApiResponse({ status: 404, description: 'Профіль виконавця не знайдено' })
    findByCaretaker(@Param('userId') userId: string) {
        return this.servicesService.findByCaretaker(userId);
    }
}
