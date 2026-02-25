import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateCaretakerProfileDto } from './dto/create-caretaker-profile.dto';
import { UpdateCaretakerProfileDto } from './dto/update-caretaker-profile.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get(':id')
    @ApiOperation({ summary: 'Отримати публічний профіль користувача' })
    @ApiResponse({ status: 200, description: 'Профіль знайдено' })
    @ApiResponse({ status: 404, description: 'Користувача не знайдено' })
    getPublicProfile(@Param('id') id: string) {
        return this.usersService.getPublicProfile(id);
    }

    @Patch('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Оновити власний профіль' })
    @ApiResponse({ status: 200, description: 'Профіль оновлено' })
    updateMe(@Request() req: { user: User }, @Body() dto: UpdateUserDto) {
        return this.usersService.updateUser(req.user.id, dto);
    }

    @Post('me/caretaker-profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Створити профіль виконавця' })
    @ApiResponse({ status: 201, description: 'Профіль виконавця створено' })
    @ApiResponse({ status: 409, description: 'Профіль виконавця вже існує' })
    createCaretakerProfile(
        @Request() req: { user: User },
        @Body() dto: CreateCaretakerProfileDto,
    ) {
        return this.usersService.createCaretakerProfile(req.user.id, dto);
    }

    @Patch('me/caretaker-profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Оновити профіль виконавця' })
    @ApiResponse({ status: 200, description: 'Профіль виконавця оновлено' })
    @ApiResponse({ status: 404, description: 'Профіль виконавця не знайдено' })
    updateCaretakerProfile(
        @Request() req: { user: User },
        @Body() dto: UpdateCaretakerProfileDto,
    ) {
        return this.usersService.updateCaretakerProfile(req.user.id, dto);
    }
}
