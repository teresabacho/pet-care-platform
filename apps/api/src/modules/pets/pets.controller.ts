import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PetsService } from './pets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('pets')
@Controller('pets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PetsController {
    constructor(private readonly petsService: PetsService) {}

    @Post()
    @ApiOperation({ summary: 'Додати тварину' })
    @ApiResponse({ status: 201, description: 'Тварину створено' })
    create(@Request() req: { user: User }, @Body() dto: CreatePetDto) {
        return this.petsService.create(req.user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Мої тварини' })
    @ApiResponse({ status: 200, description: 'Список тварин поточного користувача' })
    getMyPets(@Request() req: { user: User }) {
        return this.petsService.getMyPets(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Отримати тварину за id' })
    @ApiResponse({ status: 200, description: 'Дані тварини' })
    @ApiResponse({ status: 404, description: 'Тварину не знайдено' })
    getOne(@Param('id') id: string) {
        return this.petsService.getOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Оновити тварину' })
    @ApiResponse({ status: 200, description: 'Тварину оновлено' })
    @ApiResponse({ status: 403, description: 'Немає доступу' })
    @ApiResponse({ status: 404, description: 'Тварину не знайдено' })
    update(@Param('id') id: string, @Request() req: { user: User }, @Body() dto: UpdatePetDto) {
        return this.petsService.update(id, req.user.id, dto);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({ summary: 'Видалити тварину' })
    @ApiResponse({ status: 204, description: 'Тварину видалено' })
    @ApiResponse({ status: 403, description: 'Немає доступу' })
    @ApiResponse({ status: 404, description: 'Тварину не знайдено' })
    delete(@Param('id') id: string, @Request() req: { user: User }) {
        return this.petsService.delete(id, req.user.id);
    }
}
