import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from './entities/pet.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsRepository {
    constructor(
        @InjectRepository(Pet)
        private readonly repo: Repository<Pet>,
    ) {}

    create(ownerId: string, dto: CreatePetDto): Promise<Pet> {
        const pet = this.repo.create({ ownerId, ...dto });
        return this.repo.save(pet);
    }

    findAllByOwner(ownerId: string): Promise<Pet[]> {
        return this.repo.find({ where: { ownerId } });
    }

    findById(id: string): Promise<Pet | null> {
        return this.repo.findOne({ where: { id } });
    }

    async update(id: string, dto: UpdatePetDto): Promise<Pet> {
        await this.repo.update(id, dto);
        return this.repo.findOne({ where: { id } }) as Promise<Pet>;
    }

    delete(id: string): Promise<void> {
        return this.repo.delete(id).then(() => undefined);
    }
}
