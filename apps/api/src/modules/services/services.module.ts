import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServicesRepository } from './services.repository';
import { ServiceOffering } from './entities/service-offering.entity';
import { CaretakerProfile } from '../users/entities/caretaker-profile.entity';
import { GeoModule } from '../geo/geo.module';
import { ServiceTier } from './tiers/entities/service-tier.entity';
import { ServiceTiersRepository } from './tiers/service-tiers.repository';
import { SizeSurcharge } from './size-surcharges/entities/size-surcharge.entity';
import { SizeSurchargesRepository } from './size-surcharges/size-surcharges.repository';
import { ServiceAddon } from './addons/entities/service-addon.entity';
import { ServiceAddonsRepository } from './addons/service-addons.repository';
import { WalkingPolicy } from './policies/entities/walking-policy.entity';
import { PetSittingPolicy } from './policies/entities/pet-sitting-policy.entity';
import { BoardingPolicy } from './policies/entities/boarding-policy.entity';
import { GroomingPolicy } from './policies/entities/grooming-policy.entity';
import { VetVisitPolicy } from './policies/entities/vet-visit-policy.entity';
import {
    BoardingPoliciesRepository,
    GroomingPoliciesRepository,
    PetSittingPoliciesRepository,
    VetVisitPoliciesRepository,
    WalkingPoliciesRepository,
} from './policies/policies.repositories';
import { ServiceInclusion } from './inclusions/entities/service-inclusion.entity';
import { ServiceInclusionsRepository } from './inclusions/service-inclusions.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ServiceOffering,
            ServiceTier,
            SizeSurcharge,
            ServiceAddon,
            WalkingPolicy,
            PetSittingPolicy,
            BoardingPolicy,
            GroomingPolicy,
            VetVisitPolicy,
            ServiceInclusion,
            CaretakerProfile,
        ]),
        GeoModule,
    ],
    controllers: [ServicesController],
    providers: [
        ServicesService,
        ServicesRepository,
        ServiceTiersRepository,
        SizeSurchargesRepository,
        ServiceAddonsRepository,
        WalkingPoliciesRepository,
        PetSittingPoliciesRepository,
        BoardingPoliciesRepository,
        GroomingPoliciesRepository,
        VetVisitPoliciesRepository,
        ServiceInclusionsRepository,
    ],
    exports: [
        ServicesService,
        ServiceTiersRepository,
        SizeSurchargesRepository,
        ServiceAddonsRepository,
        WalkingPoliciesRepository,
        PetSittingPoliciesRepository,
        BoardingPoliciesRepository,
        GroomingPoliciesRepository,
        VetVisitPoliciesRepository,
        ServiceInclusionsRepository,
    ],
})
export class ServicesModule {}
