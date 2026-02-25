import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOffering } from './entities/service-offering.entity';
import { CreateServiceOfferingDto } from './dto/create-service-offering.dto';
import { SearchServicesDto } from './dto/search-services.dto';

@Injectable()
export class ServicesRepository {
    constructor(
        @InjectRepository(ServiceOffering)
        private readonly repo: Repository<ServiceOffering>,
    ) {}

    create(caretakerId: string, dto: CreateServiceOfferingDto): Promise<ServiceOffering> {
        const offering = this.repo.create({ caretakerId, ...dto });
        return this.repo.save(offering);
    }

    findByCaretakerId(caretakerId: string): Promise<ServiceOffering[]> {
        return this.repo.find({ where: { caretakerId } });
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
            // ST_MakePoint(longitude, latitude) — довгота ПЕРШОЮ (це важливо!)
            // ::geography — дає точну відстань по кулі землі (в метрах)
            // ST_DWithin повертає true якщо точка A знаходиться в межах radiusMeters від точки B
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
