import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PetsRepository } from './pets.repository';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { Pet } from './entities/pet.entity';

@Injectable()
export class PetsService {
    constructor(private readonly petsRepository: PetsRepository) {}

    create(ownerId: string, dto: CreatePetDto): Promise<Pet> {
        return this.petsRepository.create(ownerId, dto);
    }

    getMyPets(ownerId: string): Promise<Pet[]> {
        return this.petsRepository.findAllByOwner(ownerId);
    }

    async getOne(id: string): Promise<Pet> {
        const pet = await this.petsRepository.findById(id);
        if (!pet) throw new NotFoundException('Тварину не знайдено');
        return pet;
    }

    async update(id: string, userId: string, dto: UpdatePetDto): Promise<Pet> {
        await this.checkOwnership(id, userId);
        return this.petsRepository.update(id, dto);
    }

    async delete(id: string, userId: string): Promise<void> {
        await this.checkOwnership(id, userId);
        return this.petsRepository.delete(id);
    }

    private async checkOwnership(petId: string, userId: string): Promise<Pet> {
        const pet = await this.petsRepository.findById(petId);
        if (!pet) throw new NotFoundException("Тварину не знайдено");
        if (pet.ownerId !== userId) throw new ForbiddenException("Цей власник не є власником тварини");

        return pet;
    }
}
