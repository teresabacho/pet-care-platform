import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Session)
        private readonly sessionRepository: Repository<Session>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async register(dto: RegisterDto) {
        const existing = await this.userRepository.findOne({
            where: { email: dto.email },
        });
        if (existing) {
            throw new ConflictException('Користувач з таким email вже існує');
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = this.userRepository.create({
            email: dto.email,
            passwordHash,
            role: dto.role,
        });
        await this.userRepository.save(user);

        return this.createSession(user);
    }

    async login(dto: LoginDto) {
        const user = await this.userRepository.findOne({
            where: { email: dto.email },
        });
        if (!user) {
            throw new UnauthorizedException('Невірний email або пароль');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Невірний email або пароль');
        }

        return this.createSession(user);
    }

    async refresh(refreshToken: string) {
        const sessions = await this.sessionRepository.find({
            where: { userId: undefined },
            relations: ['user'],
        });

        let validSession: Session | null = null;
        for (const session of sessions) {
            if (new Date() > session.expiresAt) continue;
            const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
            if (isMatch) {
                validSession = session;
                break;
            }
        }

        if (!validSession) {
            throw new UnauthorizedException('Недійсний або протухлий refresh token');
        }

        await this.sessionRepository.delete(validSession.id);
        return this.createSession(validSession.user);
    }

    private async createSession(user: User) {
        const payload = { sub: user.id, email: user.email, role: user.role };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
        });

        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const session = this.sessionRepository.create({
            userId: user.id,
            refreshTokenHash,
            expiresAt,
        });
        await this.sessionRepository.save(session);

        return { access_token: accessToken, refresh_token: refreshToken };
    }
}