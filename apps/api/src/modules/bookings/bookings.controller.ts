import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) {}

    @Post()
    @ApiOperation({ summary: 'Створити замовлення' })
    @ApiResponse({ status: 201, description: 'Замовлення створено зі статусом PENDING' })
    create(@Request() req: { user: User }, @Body() dto: CreateBookingDto) {
        return this.bookingsService.create(req.user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Мої замовлення (як власник або як виконавець)' })
    @ApiResponse({ status: 200, description: 'Список замовлень' })
    getMyBookings(@Request() req: { user: User }) {
        return this.bookingsService.getMyBookings(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Деталі замовлення' })
    @ApiResponse({ status: 200, description: 'Замовлення знайдено' })
    @ApiResponse({ status: 403, description: 'Немає доступу' })
    @ApiResponse({ status: 404, description: 'Замовлення не знайдено' })
    getOne(@Param('id') id: string, @Request() req: { user: User }) {
        return this.bookingsService.getOne(id, req.user.id);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Змінити статус замовлення' })
    @ApiResponse({ status: 200, description: 'Статус змінено' })
    @ApiResponse({ status: 400, description: 'Недопустимий перехід статусу' })
    @ApiResponse({ status: 403, description: 'Немає доступу' })
    updateStatus(
        @Param('id') id: string,
        @Request() req: { user: User },
        @Body() dto: UpdateBookingStatusDto,
    ) {
        return this.bookingsService.updateStatus(id, req.user.id, dto);
    }
}
