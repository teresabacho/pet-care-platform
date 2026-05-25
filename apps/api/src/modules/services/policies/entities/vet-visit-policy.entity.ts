import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import {
    AdditionalServiceCapability,
    BirdType,
    CatSize,
    DogSize,
    OtherPetType,
    PetAgeGroup,
    RodentType,
} from '@pet-care/shared';
import { ServiceOffering } from '../../entities/service-offering.entity';

@Entity('vet_visit_policies')
export class VetVisitPolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => ServiceOffering, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'service_offering_id' })
    serviceOffering: ServiceOffering;

    @Column({ type: 'uuid', name: 'service_offering_id', unique: true })
    serviceOfferingId: string;

    @Column({ type: 'text', array: true, default: '{}', name: 'accepted_dog_sizes' })
    acceptedDogSizes: DogSize[];

    @Column({ type: 'text', array: true, default: '{}', name: 'accepted_cat_sizes' })
    acceptedCatSizes: CatSize[];

    @Column({ type: 'text', array: true, default: '{}', name: 'accepted_age_groups' })
    acceptedAgeGroups: PetAgeGroup[];

    @Column({ type: 'boolean', default: false, name: 'accepts_special_needs_pets' })
    acceptsSpecialNeedsPets: boolean;

    @Column({ type: 'text', array: true, default: '{}' })
    capabilities: AdditionalServiceCapability[];

    @Column({ type: 'text', array: true, default: '{}', name: 'accepted_rodent_types' })
    acceptedRodentTypes: RodentType[];

    @Column({ type: 'text', array: true, default: '{}', name: 'accepted_bird_types' })
    acceptedBirdTypes: BirdType[];

    @Column({ type: 'text', array: true, default: '{}', name: 'accepted_other_pet_types' })
    acceptedOtherPetTypes: OtherPetType[];
}
