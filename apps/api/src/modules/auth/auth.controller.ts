import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({ summary: 'Реєстрація нового користувача' })
    @ApiResponse({ status: 201, description: 'Повертає access та refresh токени' })
    @ApiResponse({ status: 409, description: 'Email вже використовується' })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Вхід в систему' })
    @ApiResponse({ status: 201, description: 'Повертає access та refresh токени' })
    @ApiResponse({ status: 401, description: 'Невірний email або пароль' })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Оновити access токен' })
    @ApiResponse({ status: 201, description: 'Повертає нові access та refresh токени' })
    @ApiResponse({ status: 401, description: 'Недійсний або протухлий refresh token' })
    refresh(@Body() dto: RefreshDto) {
        return this.authService.refresh(dto.refresh_token);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Отримати поточного користувача' })
    @ApiResponse({ status: 200, description: 'Дані поточного користувача' })
    @ApiResponse({ status: 401, description: 'Не авторизований' })
    me(@Request() req: any) {
        return req.user;
    }
}