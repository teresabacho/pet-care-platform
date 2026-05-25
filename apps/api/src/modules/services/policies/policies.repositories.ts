import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { WalkingPolicy } from './entities/walking-policy.entity';
import { PetSittingPolicy } from './entities/pet-sitting-policy.entity';
import { BoardingPolicy } from './entities/boarding-policy.entity';
import { GroomingPolicy } from './entities/grooming-policy.entity';
import { VetVisitPolicy } from './entities/vet-visit-policy.entity';
import { CreateWalkingPolicyDto } from './dto/create-walking-policy.dto';
import { CreatePetSittingPolicyDto } from './dto/create-pet-sitting-policy.dto';
import { CreateBoardingPolicyDto } from './dto/create-boarding-policy.dto';
import { CreateGroomingPolicyDto } from './dto/create-grooming-policy.dto';
import { CreateVetVisitPolicyDto } from './dto/create-vet-visit-policy.dto';

@Injectable()
export class WalkingPoliciesRepository {
    constructor(
        @InjectRepository(WalkingPolicy)
        private readonly repo: Repository<WalkingPolicy>,
    ) {}

    findByOfferingId(serviceOfferingId: string): Promise<WalkingPolicy | null> {
        return this.repo.findOne({ where: { serviceOfferingId } });
    }

    create(
        manager: EntityManager,
        serviceOfferingId: string,
        dto: CreateWalkingPolicyDto,
    ): Promise<WalkingPolicy> {
        const entity = manager.create(WalkingPolicy, {
            serviceOfferingId,
            acceptedDogSizes: dto.acceptedDogSizes,
            acceptedCatSizes: dto.acceptedCatSizes ?? [],
            acceptedAgeGroups: dto.acceptedAgeGroups,
            acceptsSpecialNeedsPets: dto.acceptsSpecialNeedsPets,
            capabilities: dto.capabilities ?? [],
            maxDogsAtOnce: dto.maxDogsAtOnce,
        });
        return manager.save(WalkingPolicy, entity);
    }
}

@Injectable()
export class PetSittingPoliciesRepository {
    constructor(
        @InjectRepository(PetSittingPolicy)
        private readonly repo: Repository<PetSittingPolicy>,
    ) {}

    findByOfferingId(serviceOfferingId: string): Promise<PetSittingPolicy | null> {
        return this.repo.findOne({ where: { serviceOfferingId } });
    }

    create(
        manager: EntityManager,
        serviceOfferingId: string,
        dto: CreatePetSittingPolicyDto,
    ): Promise<PetSittingPolicy> {
        const entity = manager.create(PetSittingPolicy, {
            serviceOfferingId,
            acceptedDogSizes: dto.acceptedDogSizes,
            acceptedCatSizes: dto.acceptedCatSizes,
            acceptedAgeGroups: dto.acceptedAgeGroups,
            acceptsSpecialNeedsPets: dto.acceptsSpecialNeedsPets,
            capabilities: dto.capabilities ?? [],
            acceptedRodentTypes: dto.acceptedRodentTypes ?? [],
            acceptedBirdTypes: dto.acceptedBirdTypes ?? [],
            acceptedOtherPetTypes: dto.acceptedOtherPetTypes ?? [],
        });
        return manager.save(PetSittingPolicy, entity);
    }
}

@Injectable()
export class BoardingPoliciesRepository {
    constructor(
        @InjectRepository(BoardingPolicy)
        private readonly repo: Repository<BoardingPolicy>,
    ) {}

    findByOfferingId(serviceOfferingId: string): Promise<BoardingPolicy | null> {
        return this.repo.findOne({ where: { serviceOfferingId } });
    }

    create(
        manager: EntityManager,
        serviceOfferingId: string,
        dto: CreateBoardingPolicyDto,
    ): Promise<BoardingPolicy> {
        const entity = manager.create(BoardingPolicy, {
            serviceOfferingId,
            acceptedDogSizes: dto.acceptedDogSizes,
            acceptedCatSizes: dto.acceptedCatSizes,
            acceptedAgeGroups: dto.acceptedAgeGroups,
            acceptsSpecialNeedsPets: dto.acceptsSpecialNeedsPets,
            capabilities: dto.capabilities ?? [],
            homeConditions: dto.homeConditions,
            acceptedRodentTypes: dto.acceptedRodentTypes ?? [],
            acceptedBirdTypes: dto.acceptedBirdTypes ?? [],
            acceptedOtherPetTypes: dto.acceptedOtherPetTypes ?? [],
        });
        return manager.save(BoardingPolicy, entity);
    }
}

@Injectable()
export class GroomingPoliciesRepository {
    constructor(
        @InjectRepository(GroomingPolicy)
        private readonly repo: Repository<GroomingPolicy>,
    ) {}

    findByOfferingId(serviceOfferingId: string): Promise<GroomingPolicy | null> {
        return this.repo.findOne({ where: { serviceOfferingId } });
    }

    create(
        manager: EntityManager,
        serviceOfferingId: string,
        dto: CreateGroomingPolicyDto,
    ): Promise<GroomingPolicy> {
        const entity = manager.create(GroomingPolicy, {
            serviceOfferingId,
            acceptedDogSizes: dto.acceptedDogSizes,
            acceptedCatSizes: dto.acceptedCatSizes,
            acceptedAgeGroups: dto.acceptedAgeGroups,
            acceptsSpecialNeedsPets: dto.acceptsSpecialNeedsPets,
            capabilities: dto.capabilities ?? [],
            acceptedRodentTypes: dto.acceptedRodentTypes ?? [],
            acceptedBirdTypes: dto.acceptedBirdTypes ?? [],
            acceptedOtherPetTypes: dto.acceptedOtherPetTypes ?? [],
        });
        return manager.save(GroomingPolicy, entity);
    }
}

@Injectable()
export class VetVisitPoliciesRepository {
    constructor(
        @InjectRepository(VetVisitPolicy)
        private readonly repo: Repository<VetVisitPolicy>,
    ) {}

    findByOfferingId(serviceOfferingId: string): Promise<VetVisitPolicy | null> {
        return this.repo.findOne({ where: { serviceOfferingId } });
    }

    create(
        manager: EntityManager,
        serviceOfferingId: string,
        dto: CreateVetVisitPolicyDto,
    ): Promise<VetVisitPolicy> {
        const entity = manager.create(VetVisitPolicy, {
            serviceOfferingId,
            acceptedDogSizes: dto.acceptedDogSizes,
            acceptedCatSizes: dto.acceptedCatSizes,
            acceptedAgeGroups: dto.acceptedAgeGroups,
            acceptsSpecialNeedsPets: dto.acceptsSpecialNeedsPets,
            capabilities: dto.capabilities ?? [],
            acceptedRodentTypes: dto.acceptedRodentTypes ?? [],
            acceptedBirdTypes: dto.acceptedBirdTypes ?? [],
            acceptedOtherPetTypes: dto.acceptedOtherPetTypes ?? [],
        });
        return manager.save(VetVisitPolicy, entity);
    }
}
