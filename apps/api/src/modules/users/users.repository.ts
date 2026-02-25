import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { CaretakerProfile } from './entities/caretaker-profile.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateCaretakerProfileDto } from './dto/create-caretaker-profile.dto';
import { UpdateCaretakerProfileDto } from './dto/update-caretaker-profile.dto';

@Injectable()
export class UsersRepository {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(CaretakerProfile)
        private readonly caretakerProfileRepo: Repository<CaretakerProfile>,
    ) {}

    findUserById(id: string): Promise<User | null> {
        return this.userRepo.findOne({
            where: { id },
            relations: ['caretakerProfile'],
        });
    }

    async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
        await this.userRepo.update(id, dto);
        return this.userRepo.findOne({
            where: { id },
            relations: ['caretakerProfile'],
        }) as Promise<User>;
    }

    findCaretakerProfileByUserId(userId: string): Promise<CaretakerProfile | null> {
        return this.caretakerProfileRepo.findOne({ where: { userId } });
    }

    createCaretakerProfile(userId: string, dto: CreateCaretakerProfileDto): Promise<CaretakerProfile> {
        const profile = this.caretakerProfileRepo.create({ userId, ...dto });
        return this.caretakerProfileRepo.save(profile);
    }

    async updateCaretakerProfile(userId: string, dto: UpdateCaretakerProfileDto): Promise<CaretakerProfile> {
        await this.caretakerProfileRepo.update({ userId }, dto);
        return this.caretakerProfileRepo.findOne({ where: { userId } }) as Promise<CaretakerProfile>;
    }
}
