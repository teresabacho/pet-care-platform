import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceType } from '@pet-care/shared';
import { ServiceOffering } from './entities/service-offering.entity';
import { SearchServicesDto } from './dto/search-services.dto';

@Injectable()
export class ServicesRepository {
    constructor(
        @InjectRepository(ServiceOffering)
        private readonly repo: Repository<ServiceOffering>,
    ) {}

    findById(id: string): Promise<ServiceOffering | null> {
        return this.repo.findOne({ where: { id }, relations: ['caretaker'] });
    }

    findByCaretakerId(caretakerId: string): Promise<ServiceOffering[]> {
        return this.repo.find({ where: { caretakerId } });
    }

    findByCaretakerAndType(
        caretakerId: string,
        serviceType: ServiceType,
    ): Promise<ServiceOffering | null> {
        return this.repo.findOne({ where: { caretakerId, serviceType } });
    }

    async delete(id: string): Promise<void> {
        await this.repo.delete(id);
    }

    async search(dto: SearchServicesDto): Promise<ServiceOffering[]> {
        const qb = this.repo
            .createQueryBuilder('so')
            .leftJoinAndSelect('so.caretaker', 'cp')
            .leftJoinAndSelect('cp.user', 'u');

        if (dto.type) {
            qb.andWhere('so.service_type = :type', { type: dto.type });
        }

        if (dto.lat !== undefined && dto.lng !== undefined && dto.radiusKm !== undefined) {
            // ST_MakePoint(longitude, latitude) — довгота ПЕРШОЮ
            // ::geography — точна відстань по кулі (в метрах)
            // ST_DWithin використовує реальні координати, навіть якщо потім обфускується відповідь
            qb.andWhere(
                `ST_DWithin(
                    geography(ST_SetSRID(ST_MakePoint(cp.service_longitude, cp.service_latitude), 4326)),
                    geography(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)),
                    :radiusMeters
                )`,
                { lng: dto.lng, lat: dto.lat, radiusMeters: dto.radiusKm * 1000 },
            );
        }

        return qb.getMany();
    }
}
