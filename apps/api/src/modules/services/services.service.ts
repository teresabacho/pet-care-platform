import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicesRepository } from './services.repository';
import { CaretakerProfile } from '../users/entities/caretaker-profile.entity';
import { CreateServiceOfferingDto } from './dto/create-service-offering.dto';
import { SearchServicesDto } from './dto/search-services.dto';

@Injectable()
export class ServicesService {
    constructor(
        private readonly servicesRepository: ServicesRepository,
        @InjectRepository(CaretakerProfile)
        private readonly caretakerProfileRepo: Repository<CaretakerProfile>,
    ) {}

    async create(userId: string, dto: CreateServiceOfferingDto) {
        const profile = await this.caretakerProfileRepo.findOne({ where: { userId } });
        if (!profile) {
            throw new NotFoundException('Спочатку створіть профіль виконавця');
        }
        return this.servicesRepository.create(profile.id, dto);
    }

    search(dto: SearchServicesDto) {
        return this.servicesRepository.search(dto);
    }

    async findByCaretaker(userId: string) {
        const profile = await this.caretakerProfileRepo.findOne({ where: { userId } });
        if (!profile) {
            throw new NotFoundException('Профіль виконавця не знайдено');
        }
        return this.servicesRepository.findByCaretakerId(profile.id);
    }
}
