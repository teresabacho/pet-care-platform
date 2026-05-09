import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ServiceInclusion } from './entities/service-inclusion.entity';

@Injectable()
export class ServiceInclusionsRepository {
    constructor(
        @InjectRepository(ServiceInclusion)
        private readonly repo: Repository<ServiceInclusion>,
    ) {}

    findByOfferingId(serviceOfferingId: string): Promise<ServiceInclusion[]> {
        return this.repo.find({
            where: { serviceOfferingId },
            order: { orderIndex: 'ASC' },
        });
    }

    createMany(
        manager: EntityManager,
        serviceOfferingId: string,
        items: Array<{ text: string }>,
    ): Promise<ServiceInclusion[]> {
        const entities = items.map((item, idx) =>
            manager.create(ServiceInclusion, {
                serviceOfferingId,
                text: item.text,
                orderIndex: idx,
            }),
        );
        return manager.save(ServiceInclusion, entities);
    }
}
