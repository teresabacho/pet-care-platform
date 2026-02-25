import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateCaretakerProfileDto } from './dto/create-caretaker-profile.dto';
import { UpdateCaretakerProfileDto } from './dto/update-caretaker-profile.dto';

@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async getPublicProfile(id: string) {
        const user = await this.usersRepository.findUserById(id);
        if (!user) {
            throw new NotFoundException('Користувача не знайдено');
        }
        return user;
    }

    updateUser(userId: string, dto: UpdateUserDto) {
        return this.usersRepository.updateUser(userId, dto);
    }

    async createCaretakerProfile(userId: string, dto: CreateCaretakerProfileDto) {
        const existing = await this.usersRepository.findCaretakerProfileByUserId(userId);
        if (existing) {
            throw new ConflictException('Профіль виконавця вже існує');
        }
        return this.usersRepository.createCaretakerProfile(userId, dto);
    }

    async updateCaretakerProfile(userId: string, dto: UpdateCaretakerProfileDto) {
        const existing = await this.usersRepository.findCaretakerProfileByUserId(userId);
        if (!existing) {
            throw new NotFoundException('Профіль виконавця не знайдено');
        }
        return this.usersRepository.updateCaretakerProfile(userId, dto);
    }
}
