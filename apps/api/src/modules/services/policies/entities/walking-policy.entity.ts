import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { AdditionalServiceCapability, CatSize, DogSize, PetAgeGroup } from '@pet-care/shared';
import { ServiceOffering } from '../../entities/service-offering.entity';

@Entity('walking_policies')
export class WalkingPolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => ServiceOffering, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'service_offering_id' })
    serviceOffering: ServiceOffering;

    @Column({ type: 'uuid', name: 'service_offering_id', unique: true })
    serviceOfferingId: string;

    @Column({ type: 'text', array: true, default: '{}', name: 'accepted_dog_sizes' })
    acceptedDogSizes: DogSize[];

    // Котів теж можна вигулювати — додано за фідбеком користувача.
    @Column({ type: 'text', array: true, default: '{}', name: 'accepted_cat_sizes' })
    acceptedCatSizes: CatSize[];

    @Column({ type: 'text', array: true, default: '{}', name: 'accepted_age_groups' })
    acceptedAgeGroups: PetAgeGroup[];

    @Column({ type: 'boolean', default: false, name: 'accepts_special_needs_pets' })
    acceptsSpecialNeedsPets: boolean;

    @Column({ type: 'text', array: true, default: '{}' })
    capabilities: AdditionalServiceCapability[];

    @Column({ type: 'int', default: 1, name: 'max_dogs_at_once' })
    maxDogsAtOnce: number;
}
