import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Залишити відгук (тільки після COMPLETED букінгу)' })
    @ApiResponse({ status: 201, description: 'Відгук створено' })
    @ApiResponse({ status: 400, description: 'Букінг ще не завершено' })
    @ApiResponse({ status: 403, description: 'Не є власником цього букінгу' })
    @ApiResponse({ status: 404, description: 'Букінг не знайдено' })
    @ApiResponse({ status: 409, description: 'Відгук для цього букінгу вже існує' })
    create(@Request() req: { user: User }, @Body() dto: CreateReviewDto) {
        return this.reviewsService.create(req.user.id, dto);
    }

    @Get('user/:id')
    @ApiOperation({ summary: 'Відгуки про користувача з середнім рейтингом' })
    @ApiResponse({ status: 200, description: 'Список відгуків і середній рейтинг' })
    findByUser(@Param('id') id: string) {
        return this.reviewsService.findByUser(id);
    }
}
