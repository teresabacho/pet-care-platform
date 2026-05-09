import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SizeSurcharge } from './entities/size-surcharge.entity';

@Injectable()
export class SizeSurchargesRepository {
    constructor(
        @InjectRepository(SizeSurcharge)
        private readonly repo: Repository<SizeSurcharge>,
    ) {}

    findByOfferingId(serviceOfferingId: string): Promise<SizeSurcharge[]> {
        return this.repo.find({ where: { serviceOfferingId } });
    }

    findByOfferingAndSize(
        serviceOfferingId: string,
        petSpecies: 'DOG' | 'CAT',
        size: string,
    ): Promise<SizeSurcharge | null> {
        return this.repo.findOne({ where: { serviceOfferingId, petSpecies, size } });
    }

    createMany(
        manager: EntityManager,
        serviceOfferingId: string,
        items: Array<{ petSpecies: 'DOG' | 'CAT'; size: string; surchargeAmount: number }>,
    ): Promise<SizeSurcharge[]> {
        const entities = items.map((s) =>
            manager.create(SizeSurcharge, {
                serviceOfferingId,
                petSpecies: s.petSpecies,
                size: s.size,
                surchargeAmount: s.surchargeAmount,
            }),
        );
        return manager.save(SizeSurcharge, entities);
    }
}
