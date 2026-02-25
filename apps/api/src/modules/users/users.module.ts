import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { User } from '../auth/entities/user.entity';
import { CaretakerProfile } from './entities/caretaker-profile.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, CaretakerProfile])],
    controllers: [UsersController],
    providers: [UsersService, UsersRepository],
    exports: [UsersService],
})
export class UsersModule {}
