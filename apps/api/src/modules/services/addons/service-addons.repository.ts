import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { AddonPriceUnit } from '@pet-care/shared';
import { ServiceAddon } from './entities/service-addon.entity';

@Injectable()
export class ServiceAddonsRepository {
    constructor(
        @InjectRepository(ServiceAddon)
        private readonly repo: Repository<ServiceAddon>,
    ) {}

    findByOfferingId(serviceOfferingId: string): Promise<ServiceAddon[]> {
        return this.repo.find({ where: { serviceOfferingId } });
    }

    findByIds(ids: string[]): Promise<ServiceAddon[]> {
        if (ids.length === 0) return Promise.resolve([]);
        return this.repo.find({ where: { id: In(ids) } });
    }

    createMany(
        manager: EntityManager,
        serviceOfferingId: string,
        items: Array<{
            name: string;
            description?: string | null;
            price: number;
            priceUnit: AddonPriceUnit;
        }>,
    ): Promise<ServiceAddon[]> {
        const entities = items.map((a) =>
            manager.create(ServiceAddon, {
                serviceOfferingId,
                name: a.name,
                description: a.description ?? null,
                price: a.price,
                priceUnit: a.priceUnit,
            }),
        );
        return manager.save(ServiceAddon, entities);
    }
}
