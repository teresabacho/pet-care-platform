import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { ServiceType } from '@pet-care/shared';
import { ServicesRepository } from './services.repository';
import { CaretakerProfile } from '../users/entities/caretaker-profile.entity';
import { ServiceOffering } from './entities/service-offering.entity';
import { CreateServiceOfferingDto } from './dto/create-service-offering.dto';
import {
    UpdateServiceOfferingDto,
    UpdateServiceTierDto,
} from './dto/update-service-offering.dto';
import { SearchServicesDto } from './dto/search-services.dto';
import { GeoService } from '../geo/geo.service';
import { ServiceTier } from './tiers/entities/service-tier.entity';
import { ServiceTiersRepository } from './tiers/service-tiers.repository';
import { SizeSurcharge } from './size-surcharges/entities/size-surcharge.entity';
import { SizeSurchargesRepository } from './size-surcharges/size-surcharges.repository';
import { assertMediumSurchargeIsZero } from './size-surcharges/validate-medium-zero';
import { ServiceAddon } from './addons/entities/service-addon.entity';
import { ServiceAddonsRepository } from './addons/service-addons.repository';
import { WalkingPolicy } from './policies/entities/walking-policy.entity';
import { PetSittingPolicy } from './policies/entities/pet-sitting-policy.entity';
import { BoardingPolicy } from './policies/entities/boarding-policy.entity';
import {
    BoardingPoliciesRepository,
    PetSittingPoliciesRepository,
    WalkingPoliciesRepository,
} from './policies/policies.repositories';

// Які serviceType потребують Policy і яку саме.
type PolicyKey = 'walkingPolicy' | 'petSittingPolicy' | 'boardingPolicy';
const POLICY_FOR_TYPE: Partial<Record<ServiceType, PolicyKey>> = {
    [ServiceType.WALKING]: 'walkingPolicy',
    [ServiceType.PET_SITTING]: 'petSittingPolicy',
    [ServiceType.BOARDING]: 'boardingPolicy',
};

@Injectable()
export class ServicesService {
    constructor(
        private readonly servicesRepository: ServicesRepository,
        @InjectRepository(CaretakerProfile)
        private readonly caretakerProfileRepo: Repository<CaretakerProfile>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly geoService: GeoService,
        private readonly tiersRepo: ServiceTiersRepository,
        private readonly surchargesRepo: SizeSurchargesRepository,
        private readonly addonsRepo: ServiceAddonsRepository,
        private readonly walkingPoliciesRepo: WalkingPoliciesRepository,
        private readonly petSittingPoliciesRepo: PetSittingPoliciesRepository,
        private readonly boardingPoliciesRepo: BoardingPoliciesRepository,
    ) {}

    async create(userId: string, dto: CreateServiceOfferingDto): Promise<ServiceOffering> {
        const profile = await this.caretakerProfileRepo.findOne({ where: { userId } });
        if (!profile) {
            throw new NotFoundException('Спочатку створіть профіль виконавця');
        }

        this.assertPolicyMatchesType(dto);

        if (dto.sizeSurcharges?.length) {
            assertMediumSurchargeIsZero(dto.sizeSurcharges);
        }

        const existing = await this.servicesRepository.findByCaretakerAndType(
            profile.id,
            dto.serviceType,
        );
        if (existing) {
            throw new ConflictException(
                `Послуга типу ${dto.serviceType} вже існує — оновіть існуючий offering`,
            );
        }

        const offeringId = await this.dataSource.transaction(async (manager) => {
            const offering = manager.create(ServiceOffering, {
                caretakerId: profile.id,
                serviceType: dto.serviceType,
                description: dto.description ?? null,
            });
            const saved = await manager.save(ServiceOffering, offering);

            await this.tiersRepo.createMany(manager, saved.id, dto.tiers);

            if (dto.sizeSurcharges?.length) {
                await this.surchargesRepo.createMany(
                    manager,
                    saved.id,
                    dto.sizeSurcharges,
                );
            }

            if (dto.addons?.length) {
                await this.addonsRepo.createMany(manager, saved.id, dto.addons);
            }

            if (dto.serviceType === ServiceType.WALKING && dto.walkingPolicy) {
                await this.walkingPoliciesRepo.create(manager, saved.id, dto.walkingPolicy);
            } else if (
                dto.serviceType === ServiceType.PET_SITTING &&
                dto.petSittingPolicy
            ) {
                await this.petSittingPoliciesRepo.create(
                    manager,
                    saved.id,
                    dto.petSittingPolicy,
                );
            } else if (dto.serviceType === ServiceType.BOARDING && dto.boardingPolicy) {
                await this.boardingPoliciesRepo.create(manager, saved.id, dto.boardingPolicy);
            }

            return saved.id;
        });

        return this.findById(offeringId);
    }

    async findById(id: string): Promise<ServiceOffering> {
        const offering = await this.servicesRepository.findById(id);
        if (!offering) {
            throw new NotFoundException('Послугу не знайдено');
        }
        const enriched = await this.enrichOne(offering);
        return enriched;
    }

    async search(dto: SearchServicesDto) {
        const offerings = await this.servicesRepository.search(dto);
        for (const offering of offerings) {
            const cp = offering.caretaker;
            if (
                cp &&
                cp.addressIsPublic === false &&
                cp.serviceLatitude !== null &&
                cp.serviceLongitude !== null
            ) {
                const obfuscated = this.geoService.obfuscateLocation(
                    cp.serviceLatitude,
                    cp.serviceLongitude,
                    cp.id,
                );
                cp.serviceLatitude = obfuscated.latitude;
                cp.serviceLongitude = obfuscated.longitude;
            }
        }
        return Promise.all(offerings.map((o) => this.enrichOne(o)));
    }

    async findByCaretaker(userId: string) {
        const profile = await this.caretakerProfileRepo.findOne({ where: { userId } });
        if (!profile) {
            throw new NotFoundException('Профіль виконавця не знайдено');
        }
        const offerings = await this.servicesRepository.findByCaretakerId(profile.id);
        return Promise.all(offerings.map((o) => this.enrichOne(o)));
    }

    async update(
        id: string,
        userId: string,
        dto: UpdateServiceOfferingDto,
    ): Promise<ServiceOffering> {
        const offering = await this.servicesRepository.findById(id);
        if (!offering) {
            throw new NotFoundException('Послугу не знайдено');
        }
        const profile = await this.caretakerProfileRepo.findOne({ where: { userId } });
        if (!profile || profile.id !== offering.caretakerId) {
            throw new BadRequestException('Це не ваша послуга');
        }

        // Policy має відповідати serviceType offering-у. serviceType сам не міняється.
        this.assertUpdatePolicyMatchesType(offering.serviceType, dto);

        if (dto.sizeSurcharges?.length) {
            assertMediumSurchargeIsZero(dto.sizeSurcharges);
        }

        try {
            await this.dataSource.transaction(async (manager) => {
                if (dto.description !== undefined) {
                    await manager.update(
                        ServiceOffering,
                        { id },
                        { description: dto.description ?? null },
                    );
                }

                if (dto.tiers !== undefined) {
                    await this.applyTiersDiff(manager, id, dto.tiers);
                }

                if (dto.sizeSurcharges !== undefined) {
                    await manager.delete(SizeSurcharge, { serviceOfferingId: id });
                    if (dto.sizeSurcharges.length > 0) {
                        await this.surchargesRepo.createMany(
                            manager,
                            id,
                            dto.sizeSurcharges,
                        );
                    }
                }

                if (dto.addons !== undefined) {
                    await manager.delete(ServiceAddon, { serviceOfferingId: id });
                    if (dto.addons.length > 0) {
                        await this.addonsRepo.createMany(manager, id, dto.addons);
                    }
                }

                // Policy: delete + create — простіше за update, бо в DTO повний об'єкт
                if (
                    offering.serviceType === ServiceType.WALKING &&
                    dto.walkingPolicy
                ) {
                    await manager.delete(WalkingPolicy, { serviceOfferingId: id });
                    await this.walkingPoliciesRepo.create(manager, id, dto.walkingPolicy);
                } else if (
                    offering.serviceType === ServiceType.PET_SITTING &&
                    dto.petSittingPolicy
                ) {
                    await manager.delete(PetSittingPolicy, { serviceOfferingId: id });
                    await this.petSittingPoliciesRepo.create(
                        manager,
                        id,
                        dto.petSittingPolicy,
                    );
                } else if (
                    offering.serviceType === ServiceType.BOARDING &&
                    dto.boardingPolicy
                ) {
                    await manager.delete(BoardingPolicy, { serviceOfferingId: id });
                    await this.boardingPoliciesRepo.create(manager, id, dto.boardingPolicy);
                }
            });
        } catch (err) {
            // Tier deletion заблоковано FK RESTRICT з Booking.tierId — клієнт
            // намагається прибрати тариф, на який є замовлення.
            if (
                err instanceof QueryFailedError &&
                (err as QueryFailedError & { code?: string }).code === '23503'
            ) {
                throw new ConflictException(
                    'Неможливо змінити тариф: на нього є існуючі замовлення',
                );
            }
            throw err;
        }

        return this.findById(id);
    }

    async delete(id: string, userId: string): Promise<void> {
        const offering = await this.servicesRepository.findById(id);
        if (!offering) {
            throw new NotFoundException('Послугу не знайдено');
        }
        const profile = await this.caretakerProfileRepo.findOne({ where: { userId } });
        if (!profile || profile.id !== offering.caretakerId) {
            throw new BadRequestException('Це не ваша послуга');
        }
        try {
            await this.servicesRepository.delete(id);
        } catch (err) {
            // FK RESTRICT з Booking.tierId — у базі є активні замовлення, що
            // посилаються на тарифи цього offering-у. Перетворюємо у 409,
            // щоб клієнт показав зрозуміле повідомлення.
            if (
                err instanceof QueryFailedError &&
                (err as QueryFailedError & { code?: string }).code === '23503'
            ) {
                throw new ConflictException(
                    'Неможливо видалити: на цю послугу є активні або завершені замовлення',
                );
            }
            throw err;
        }
    }

    // ─────────────────────────── Helpers ───────────────────────────

    private assertPolicyMatchesType(dto: CreateServiceOfferingDto): void {
        const required = POLICY_FOR_TYPE[dto.serviceType];
        const provided: PolicyKey[] = [];
        if (dto.walkingPolicy) provided.push('walkingPolicy');
        if (dto.petSittingPolicy) provided.push('petSittingPolicy');
        if (dto.boardingPolicy) provided.push('boardingPolicy');

        if (required) {
            if (provided.length !== 1 || provided[0] !== required) {
                throw new BadRequestException(
                    `Для serviceType=${dto.serviceType} має бути передано саме ${required} (отримано: ${provided.join(', ') || 'нічого'})`,
                );
            }
        } else {
            // GROOMING / VET_VISIT — поки без policy
            if (provided.length > 0) {
                throw new BadRequestException(
                    `Для serviceType=${dto.serviceType} policy не задається`,
                );
            }
        }
    }

    // На відміну від create, тут policy може бути не передана (тоді не чіпаємо).
    // Але якщо передана — має відповідати serviceType.
    private assertUpdatePolicyMatchesType(
        serviceType: ServiceType,
        dto: UpdateServiceOfferingDto,
    ): void {
        const required = POLICY_FOR_TYPE[serviceType];
        const provided: PolicyKey[] = [];
        if (dto.walkingPolicy) provided.push('walkingPolicy');
        if (dto.petSittingPolicy) provided.push('petSittingPolicy');
        if (dto.boardingPolicy) provided.push('boardingPolicy');

        if (provided.length === 0) return; // policy не міняємо — ок

        if (provided.length > 1) {
            throw new BadRequestException(
                `Можна передати лише одну policy, отримано: ${provided.join(', ')}`,
            );
        }
        if (required && provided[0] !== required) {
            throw new BadRequestException(
                `Для serviceType=${serviceType} має бути ${required}, а не ${provided[0]}`,
            );
        }
        if (!required) {
            throw new BadRequestException(
                `Для serviceType=${serviceType} policy не задається`,
            );
        }
    }

    // Diff-based update tiers: existing → update, нові (без id) → create,
    // existing що відсутні в payload → delete (FK RESTRICT захищає від
    // видалення тих, що мають Booking).
    private async applyTiersDiff(
        manager: EntityManager,
        offeringId: string,
        incoming: UpdateServiceTierDto[],
    ): Promise<void> {
        const existing = await this.tiersRepo.findByOfferingId(offeringId);
        const incomingIds = new Set(
            incoming.map((t) => t.id).filter((x): x is string => Boolean(x)),
        );

        // Видалити ті, яких немає в payload-і
        for (const t of existing) {
            if (!incomingIds.has(t.id)) {
                await manager.delete(ServiceTier, { id: t.id });
            }
        }

        // Update існуючих + create нових
        const existingById = new Map(existing.map((t) => [t.id, t]));
        const toCreate: UpdateServiceTierDto[] = [];
        for (const t of incoming) {
            if (t.id && existingById.has(t.id)) {
                await manager.update(
                    ServiceTier,
                    { id: t.id },
                    {
                        durationMinutes: t.durationMinutes ?? null,
                        basePrice: t.basePrice,
                        priceUnit: t.priceUnit,
                    },
                );
            } else {
                toCreate.push(t);
            }
        }

        if (toCreate.length > 0) {
            await this.tiersRepo.createMany(
                manager,
                offeringId,
                toCreate.map((t) => ({
                    durationMinutes: t.durationMinutes ?? null,
                    basePrice: t.basePrice,
                    priceUnit: t.priceUnit,
                })),
            );
        }
    }

    private async enrichOne(offering: ServiceOffering): Promise<
        ServiceOffering & {
            tiers: ServiceTier[];
            sizeSurcharges: SizeSurcharge[];
            addons: ServiceAddon[];
            walkingPolicy: WalkingPolicy | null;
            petSittingPolicy: PetSittingPolicy | null;
            boardingPolicy: BoardingPolicy | null;
        }
    > {
        const [tiers, sizeSurcharges, addons] = await Promise.all([
            this.tiersRepo.findByOfferingId(offering.id),
            this.surchargesRepo.findByOfferingId(offering.id),
            this.addonsRepo.findByOfferingId(offering.id),
        ]);

        let walkingPolicy: WalkingPolicy | null = null;
        let petSittingPolicy: PetSittingPolicy | null = null;
        let boardingPolicy: BoardingPolicy | null = null;

        if (offering.serviceType === ServiceType.WALKING) {
            walkingPolicy = await this.walkingPoliciesRepo.findByOfferingId(offering.id);
        } else if (offering.serviceType === ServiceType.PET_SITTING) {
            petSittingPolicy = await this.petSittingPoliciesRepo.findByOfferingId(offering.id);
        } else if (offering.serviceType === ServiceType.BOARDING) {
            boardingPolicy = await this.boardingPoliciesRepo.findByOfferingId(offering.id);
        }

        return Object.assign(offering, {
            tiers,
            sizeSurcharges,
            addons,
            walkingPolicy,
            petSittingPolicy,
            boardingPolicy,
        });
    }
}
