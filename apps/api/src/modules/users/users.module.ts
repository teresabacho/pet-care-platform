import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { User } from '../auth/entities/user.entity';
import { CaretakerProfile } from './entities/caretaker-profile.entity';
import { GeoModule } from '../geo/geo.module';

@Module({
    imports: [TypeOrmModule.forFeature([User, CaretakerProfile]), GeoModule],
    controllers: [UsersController],
    providers: [UsersService, UsersRepository],
    exports: [UsersService, UsersRepository],
})
export class UsersModule {}
