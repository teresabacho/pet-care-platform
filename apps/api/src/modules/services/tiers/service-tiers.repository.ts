import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ServiceTier } from './entities/service-tier.entity';

@Injectable()
export class ServiceTiersRepository {
    constructor(
        @InjectRepository(ServiceTier)
        private readonly repo: Repository<ServiceTier>,
    ) {}

    findByOfferingId(serviceOfferingId: string): Promise<ServiceTier[]> {
        return this.repo.find({ where: { serviceOfferingId } });
    }

    findById(id: string): Promise<ServiceTier | null> {
        return this.repo.findOne({ where: { id } });
    }

    createMany(
        manager: EntityManager,
        serviceOfferingId: string,
        tiers: Array<{ durationMinutes?: number | null; basePrice: number; priceUnit: ServiceTier['priceUnit'] }>,
    ): Promise<ServiceTier[]> {
        const entities = tiers.map((t) =>
            manager.create(ServiceTier, {
                serviceOfferingId,
                durationMinutes: t.durationMinutes ?? null,
                basePrice: t.basePrice,
                priceUnit: t.priceUnit,
            }),
        );
        return manager.save(ServiceTier, entities);
    }

    async deleteByOfferingId(
        manager: EntityManager,
        serviceOfferingId: string,
    ): Promise<void> {
        await manager.delete(ServiceTier, { serviceOfferingId });
    }
}
