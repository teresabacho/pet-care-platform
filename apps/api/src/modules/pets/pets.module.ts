import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';
import { PetsRepository } from './pets.repository';
import { Pet } from './entities/pet.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Pet])],
    controllers: [PetsController],
    providers: [PetsService, PetsRepository],
    exports: [PetsService],
})
export class PetsModule {}
