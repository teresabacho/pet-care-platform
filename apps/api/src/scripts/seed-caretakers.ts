import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import {
    CatSize,
    DayType,
    DogSize,
    PetAgeGroup,
    PriceUnit,
    ServiceType,
    UserRole,
} from '@pet-care/shared';
import { AppModule } from '../app.module';
import { User } from '../modules/auth/entities/user.entity';
import { CaretakerProfile } from '../modules/users/entities/caretaker-profile.entity';
import { ServiceOffering } from '../modules/services/entities/service-offering.entity';
import { ServiceTier } from '../modules/services/tiers/entities/service-tier.entity';
import { PetSittingPolicy } from '../modules/services/policies/entities/pet-sitting-policy.entity';

interface TierSeed {
    basePrice: number;
    priceUnit: PriceUnit;
    durationMinutes: number | null;
    dayType?: DayType;
}

interface PetSittingPolicySeed {
    acceptedDogSizes: DogSize[];
    acceptedCatSizes: CatSize[];
    acceptedAgeGroups: PetAgeGroup[];
    acceptsSpecialNeedsPets: boolean;
}

interface OfferingSeed {
    serviceType: ServiceType;
    price: number;
    priceUnit: PriceUnit;
    durationMinutes: number | null;
    description: string;
    tiers?: TierSeed[];
    petSittingPolicy?: PetSittingPolicySeed;
}

interface CaretakerSeed {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    avatarUrl: string;
    bio: string;
    experienceYears: number;
    hourlyRate: number;
    serviceLatitude: number;
    serviceLongitude: number;
    radiusKm: number;
    isVerified: boolean;
    avgRating: number;
    reviewsCount: number;
    country: string;
    city: string;
    street: string;
    offerings: OfferingSeed[];
}

const DEFAULT_PASSWORD = 'caretaker123';

const SEEDS: CaretakerSeed[] = [
    {
        email: 'maria.kovalenko@seed.local',
        firstName: 'Марія',
        lastName: 'Коваленко',
        phone: '+380501112201',
        avatarUrl: 'https://i.pravatar.cc/200?img=47',
        country: 'UA',
        city: 'Київ',
        street: 'вул. Хрещатик, 22',
        bio: 'Доглядаю собак уже 5 років. Маю власну квартиру в центрі та подвір’я для активних прогулянок. Обожнюю великі породи — лабрадорів, ретриверів, вівчарок.',
        experienceYears: 5,
        hourlyRate: 180,
        serviceLatitude: 50.4501,
        serviceLongitude: 30.5234,
        radiusKm: 8,
        isVerified: true,
        avgRating: 4.8,
        reviewsCount: 87,
        offerings: [
            {
                serviceType: ServiceType.WALKING,
                price: 180,
                priceUnit: PriceUnit.PER_HOUR,
                durationMinutes: 60,
                description: 'Активна годинна прогулянка з вашим улюбленцем у парку чи знайомими маршрутами.',
            },
            {
                serviceType: ServiceType.GROOMING,
                price: 600,
                priceUnit: PriceUnit.PER_SESSION,
                durationMinutes: 90,
                description: 'Базовий грумінг: купання, стрижка, чистка вух та підрізання кігтів.',
            },
        ],
    },
    {
        email: 'dmytro.shevchenko@seed.local',
        firstName: 'Дмитро',
        lastName: 'Шевченко',
        phone: '+380671234502',
        avatarUrl: 'https://i.pravatar.cc/200?img=13',
        country: 'UA',
        city: 'Київ',
        street: 'вул. Сагайдачного, 12',
        bio: 'Працюю з тваринами 3 роки. Доглядаю вдома у власника або у себе на Подолі. Маю двох власних котів — спокійно сприймаю будь-які компанії.',
        experienceYears: 3,
        hourlyRate: 150,
        serviceLatitude: 50.4666,
        serviceLongitude: 30.5142,
        radiusKm: 6,
        isVerified: true,
        avgRating: 4.5,
        reviewsCount: 42,
        offerings: [
            {
                serviceType: ServiceType.PET_SITTING,
                price: 450,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Догляд за тваринкою у вашому домі: годування, прогулянки, гра, прибирання лотка.',
            },
            {
                serviceType: ServiceType.BOARDING,
                price: 500,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Перетримка у мене вдома. Невелика квартира на Подолі з двома спокійними котами.',
            },
        ],
    },
    {
        email: 'olena.bondar@seed.local',
        firstName: 'Олена',
        lastName: 'Бондар',
        phone: '+380931234503',
        avatarUrl: 'https://i.pravatar.cc/200?img=49',
        country: 'UA',
        city: 'Київ',
        street: 'вул. Лютеранська, 15',
        bio: 'Зоопсихолог за освітою, 7 років працюю з домашніми тваринами. Спеціалізуюсь на тривалій перетримці собак та котів з особливими потребами.',
        experienceYears: 7,
        hourlyRate: 220,
        serviceLatitude: 50.4326,
        serviceLongitude: 30.5435,
        radiusKm: 10,
        isVerified: true,
        avgRating: 4.9,
        reviewsCount: 134,
        offerings: [
            {
                serviceType: ServiceType.BOARDING,
                price: 700,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Перетримка у просторому будинку на Печерську. Окрема кімната для гостьових тваринок.',
            },
            {
                serviceType: ServiceType.PET_SITTING,
                price: 600,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Догляд вдома з можливістю медикаментозної підтримки тваринок літнього віку.',
            },
        ],
    },
    {
        email: 'andriy.melnyk@seed.local',
        firstName: 'Андрій',
        lastName: 'Мельник',
        phone: '+380501234504',
        avatarUrl: 'https://i.pravatar.cc/200?img=12',
        country: 'UA',
        city: 'Київ',
        street: 'просп. Героїв Сталінграда, 18',
        bio: 'Студент ветфаку, 2 роки самостійно вигулюю собак. Активний, спортивний — підійде енергійним породам, які потребують довгих прогулянок.',
        experienceYears: 2,
        hourlyRate: 120,
        serviceLatitude: 50.5108,
        serviceLongitude: 30.5008,
        radiusKm: 5,
        isVerified: false,
        avgRating: 4.2,
        reviewsCount: 12,
        offerings: [
            {
                serviceType: ServiceType.WALKING,
                price: 130,
                priceUnit: PriceUnit.PER_HOUR,
                durationMinutes: 60,
                description: 'Тривала активна прогулянка з пробіжкою або іграми. Підходить активним собакам.',
            },
        ],
    },
    {
        email: 'sofia.tkachenko@seed.local',
        firstName: 'Софія',
        lastName: 'Ткаченко',
        phone: '+380631234505',
        avatarUrl: 'https://i.pravatar.cc/200?img=32',
        country: 'UA',
        city: 'Київ',
        street: 'вул. Гетьмана Кирила Розумовського, 7',
        bio: 'Сертифікований грумер, 4 роки досвіду. Працюю переважно з котами, але доглядаю і собак невеликих порід. Люблю довгошерстих красенів.',
        experienceYears: 4,
        hourlyRate: 200,
        serviceLatitude: 50.4544,
        serviceLongitude: 30.3585,
        radiusKm: 7,
        isVerified: true,
        avgRating: 4.7,
        reviewsCount: 56,
        offerings: [
            {
                serviceType: ServiceType.GROOMING,
                price: 800,
                priceUnit: PriceUnit.PER_SESSION,
                durationMinutes: 120,
                description: 'Повний комплекс грумінгу: миття, стрижка, укладка, обробка від ковтунів.',
            },
            {
                serviceType: ServiceType.PET_SITTING,
                price: 500,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Домашній догляд — приходжу до вас додому 2 рази на день.',
            },
        ],
    },
    {
        email: 'yuriy.gnatenko@seed.local',
        firstName: 'Юрій',
        lastName: 'Гнатенко',
        phone: '+380671234506',
        avatarUrl: 'https://i.pravatar.cc/200?img=33',
        country: 'UA',
        city: 'Київ',
        street: 'вул. Бориспільська, 44',
        bio: 'Колишній кінолог, 6 років працюю з собаками великих порід. Маю простору ділянку у приватному будинку — ідеально для перетримки активних песиків.',
        experienceYears: 6,
        hourlyRate: 200,
        serviceLatitude: 50.4291,
        serviceLongitude: 30.6533,
        radiusKm: 12,
        isVerified: true,
        avgRating: 4.8,
        reviewsCount: 98,
        offerings: [
            {
                serviceType: ServiceType.WALKING,
                price: 200,
                priceUnit: PriceUnit.PER_HOUR,
                durationMinutes: 90,
                description: 'Прогулянка з елементами тренування — підходить для собак, які потребують дисципліни.',
            },
            {
                serviceType: ServiceType.BOARDING,
                price: 600,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Перетримка у приватному будинку з великим подвір’ям. Окремий вольєр за потреби.',
            },
        ],
    },
    {
        email: 'natalia.lozova@seed.local',
        firstName: 'Наталія',
        lastName: 'Лозова',
        phone: '+380931234507',
        avatarUrl: 'https://i.pravatar.cc/200?img=45',
        country: 'UA',
        city: 'Київ',
        street: 'вул. Олеся Гончара, 30',
        bio: 'Ветеринарний фельдшер з 10-річним досвідом. Доглядаю тварин з хронічними захворюваннями, виконую щеплення, обробки, реабілітацію.',
        experienceYears: 10,
        hourlyRate: 350,
        serviceLatitude: 50.4654,
        serviceLongitude: 30.4625,
        radiusKm: 15,
        isVerified: true,
        avgRating: 4.9,
        reviewsCount: 215,
        offerings: [
            {
                serviceType: ServiceType.VET_VISIT,
                price: 800,
                priceUnit: PriceUnit.PER_SESSION,
                durationMinutes: 60,
                description: 'Виїзний візит ветеринара: огляд, щеплення, обробка від паразитів, забір аналізів.',
            },
            {
                serviceType: ServiceType.PET_SITTING,
                price: 700,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Догляд тваринок з хронічними захворюваннями — діабет, серцеві патології, постоперац. період.',
            },
            {
                serviceType: ServiceType.BOARDING,
                price: 800,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Перетримка з медичним наглядом для тваринок літнього віку.',
            },
        ],
    },
    {
        email: 'oleh.kravets@seed.local',
        firstName: 'Олег',
        lastName: 'Кравець',
        phone: '+380501234508',
        avatarUrl: 'https://i.pravatar.cc/200?img=14',
        country: 'UA',
        city: 'Київ',
        street: 'просп. Голосіївський, 70',
        bio: 'Починаю шлях професійного вигульника, рік досвіду з друзями та родиною. Обожнюю собак, особливо середніх порід. Готовий до тривалих прогулянок.',
        experienceYears: 1,
        hourlyRate: 100,
        serviceLatitude: 50.3957,
        serviceLongitude: 30.4918,
        radiusKm: 5,
        isVerified: false,
        avgRating: 4.3,
        reviewsCount: 8,
        offerings: [
            {
                serviceType: ServiceType.WALKING,
                price: 120,
                priceUnit: PriceUnit.PER_HOUR,
                durationMinutes: 60,
                description: 'Спокійна прогулянка у Голосіївському парку. Підходить вихованим собакам без агресії.',
            },
        ],
    },
    {
        email: 'kateryna.ivanenko@seed.local',
        firstName: 'Катерина',
        lastName: 'Іваненко',
        phone: '+380631234509',
        avatarUrl: 'https://i.pravatar.cc/200?img=44',
        country: 'UA',
        city: 'Київ',
        street: 'вул. Дегтярівська, 11',
        bio: 'Грумер-стиліст з 8-річним стажем, працюю з виставковими породами. Маю обладнаний салон удома на Лук’янівці. Люблю йорків, шпіців та пуделів.',
        experienceYears: 8,
        hourlyRate: 280,
        serviceLatitude: 50.4756,
        serviceLongitude: 30.4788,
        radiusKm: 8,
        isVerified: true,
        avgRating: 4.9,
        reviewsCount: 167,
        offerings: [
            {
                serviceType: ServiceType.GROOMING,
                price: 1200,
                priceUnit: PriceUnit.PER_SESSION,
                durationMinutes: 150,
                description: 'Виставковий грумінг для дрібних та середніх порід. Стрижка за стандартом породи.',
            },
        ],
    },
    {
        email: 'taras.dubovyi@seed.local',
        firstName: 'Тарас',
        lastName: 'Дубовий',
        phone: '+380671234510',
        avatarUrl: 'https://i.pravatar.cc/200?img=17',
        country: 'UA',
        city: 'Київ',
        street: 'вул. Драйзера, 18',
        bio: 'Дресирувальник зі стажем, 3 роки спеціалізуюсь на роботі з молодими собаками. Допоможу із соціалізацією під час прогулянок.',
        experienceYears: 3,
        hourlyRate: 170,
        serviceLatitude: 50.5217,
        serviceLongitude: 30.6053,
        radiusKm: 9,
        isVerified: true,
        avgRating: 4.6,
        reviewsCount: 33,
        offerings: [
            {
                serviceType: ServiceType.WALKING,
                price: 180,
                priceUnit: PriceUnit.PER_HOUR,
                durationMinutes: 60,
                description: 'Прогулянка з елементами базової дресури — команди «сидіти», «поруч», «місце».',
            },
            {
                serviceType: ServiceType.PET_SITTING,
                price: 400,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Догляд вдома з фокусом на режимі та дисципліні тваринки.',
            },
        ],
    },
    {
        email: 'anna.moroz@seed.local',
        firstName: 'Анна',
        lastName: 'Мороз',
        phone: '+380501234511',
        avatarUrl: 'https://i.pravatar.cc/200?img=20',
        country: 'UA',
        city: 'Київ',
        street: 'вул. Велика Васильківська, 50',
        bio: 'Доглядаю тварин уже 4 роки. Приходжу до вас додому — годування, ігри, прогулянки, прибирання лотка. Маю гнучкий графік, можу приходити до 3 разів на день.',
        experienceYears: 4,
        hourlyRate: 0,
        serviceLatitude: 50.4356,
        serviceLongitude: 30.5215,
        radiusKm: 7,
        isVerified: true,
        avgRating: 4.7,
        reviewsCount: 64,
        offerings: [
            {
                serviceType: ServiceType.PET_SITTING,
                price: 350,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Догляд за тваринкою у вашому домі: годування за графіком, дві прогулянки на день, гра, прибирання.',
                tiers: [
                    { basePrice: 350, priceUnit: PriceUnit.PER_DAY, durationMinutes: null },
                ],
                petSittingPolicy: {
                    acceptedDogSizes: [DogSize.MINI, DogSize.SMALL, DogSize.MEDIUM],
                    acceptedCatSizes: [CatSize.SMALL, CatSize.MEDIUM, CatSize.LARGE],
                    acceptedAgeGroups: [
                        PetAgeGroup.YOUNG,
                        PetAgeGroup.ADULT,
                        PetAgeGroup.SENIOR,
                    ],
                    acceptsSpecialNeedsPets: false,
                },
            },
        ],
    },
    {
        email: 'iryna.petrenko@seed.local',
        firstName: 'Ірина',
        lastName: 'Петренко',
        phone: '+380671234512',
        avatarUrl: 'https://i.pravatar.cc/200?img=25',
        country: 'UA',
        city: 'Київ',
        street: 'вул. Січових Стрільців, 33',
        bio: 'Працюю з домашніми улюбленцями 6 років. Спокійна, відповідальна, у мене вдома два власні коти. Доглядаю у вашій оселі — у звичних для тваринки умовах їй комфортніше.',
        experienceYears: 6,
        hourlyRate: 0,
        serviceLatitude: 50.4592,
        serviceLongitude: 30.4985,
        radiusKm: 8,
        isVerified: true,
        avgRating: 4.9,
        reviewsCount: 102,
        offerings: [
            {
                serviceType: ServiceType.PET_SITTING,
                price: 480,
                priceUnit: PriceUnit.PER_DAY,
                durationMinutes: null,
                description: 'Повноцінний догляд вдома: годування, ігри, дві-три прогулянки, базовий медогляд, фотозвіт двічі на день.',
                tiers: [
                    { basePrice: 480, priceUnit: PriceUnit.PER_DAY, durationMinutes: null },
                ],
                petSittingPolicy: {
                    acceptedDogSizes: [
                        DogSize.MINI,
                        DogSize.SMALL,
                        DogSize.MEDIUM,
                        DogSize.LARGE,
                    ],
                    acceptedCatSizes: [CatSize.SMALL, CatSize.MEDIUM, CatSize.LARGE],
                    acceptedAgeGroups: [
                        PetAgeGroup.PUPPY_OR_KITTEN,
                        PetAgeGroup.YOUNG,
                        PetAgeGroup.ADULT,
                        PetAgeGroup.SENIOR,
                        PetAgeGroup.ELDERLY,
                    ],
                    acceptsSpecialNeedsPets: true,
                },
            },
        ],
    },
];

async function bootstrap() {
    const logger = new Logger('SeedCaretakers');
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const ds = app.get(DataSource);
    const userRepo = ds.getRepository(User);
    const caretakerRepo = ds.getRepository(CaretakerProfile);
    const offeringRepo = ds.getRepository(ServiceOffering);
    const tierRepo = ds.getRepository(ServiceTier);
    const petSittingPolicyRepo = ds.getRepository(PetSittingPolicy);

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    let created = 0;
    let updated = 0;

    for (const s of SEEDS) {
        const existingUser = await userRepo.findOne({ where: { email: s.email } });

        if (existingUser) {
            await userRepo.update(existingUser.id, {
                firstName: s.firstName,
                lastName: s.lastName,
                phone: s.phone,
                avatarUrl: s.avatarUrl,
                country: s.country,
                city: s.city,
                street: s.street,
            });

            const existingProfile = await caretakerRepo.findOne({
                where: { userId: existingUser.id },
            });
            if (existingProfile) {
                await caretakerRepo.update(existingProfile.id, {
                    bio: s.bio,
                    experienceYears: s.experienceYears,
                    hourlyRate: s.hourlyRate,
                    serviceTypes: s.offerings.map((o) => o.serviceType),
                    serviceLatitude: s.serviceLatitude,
                    serviceLongitude: s.serviceLongitude,
                    radiusKm: s.radiusKm,
                    isVerified: s.isVerified,
                    avgRating: s.avgRating,
                    reviewsCount: s.reviewsCount,
                    country: s.country,
                    city: s.city,
                    street: s.street,
                });
            }
            updated++;
            logger.log(`Updated caretaker: ${s.firstName} ${s.lastName} (${s.email})`);
            continue;
        }

        const user = await userRepo.save(
            userRepo.create({
                email: s.email,
                passwordHash,
                role: UserRole.CARETAKER,
                firstName: s.firstName,
                lastName: s.lastName,
                phone: s.phone,
                avatarUrl: s.avatarUrl,
                country: s.country,
                city: s.city,
                street: s.street,
            }),
        );

        const profile = await caretakerRepo.save(
            caretakerRepo.create({
                userId: user.id,
                bio: s.bio,
                experienceYears: s.experienceYears,
                hourlyRate: s.hourlyRate,
                serviceTypes: s.offerings.map((o) => o.serviceType),
                serviceLatitude: s.serviceLatitude,
                serviceLongitude: s.serviceLongitude,
                radiusKm: s.radiusKm,
                isVerified: s.isVerified,
                avgRating: s.avgRating,
                reviewsCount: s.reviewsCount,
                country: s.country,
                city: s.city,
                street: s.street,
            }),
        );

        for (const o of s.offerings) {
            // Поля price/priceUnit/durationMinutes на рівні offering збережені для зворотної
            // сумісності зі старими seed-записами без тарифів. Нові записи задають ціни
            // через tiers[] — окремі ServiceTier-рядки. Якщо tiers пусті, offering існує
            // без тарифів (як раніше).
            void o.price;
            void o.priceUnit;
            void o.durationMinutes;
            const offering = await offeringRepo.save(
                offeringRepo.create({
                    caretakerId: profile.id,
                    serviceType: o.serviceType,
                    description: o.description,
                }),
            );

            if (o.tiers && o.tiers.length > 0) {
                await tierRepo.save(
                    o.tiers.map((t) =>
                        tierRepo.create({
                            serviceOfferingId: offering.id,
                            basePrice: t.basePrice,
                            priceUnit: t.priceUnit,
                            durationMinutes: t.durationMinutes,
                            dayType: t.dayType ?? DayType.REGULAR,
                        }),
                    ),
                );
            }

            if (o.serviceType === ServiceType.PET_SITTING && o.petSittingPolicy) {
                await petSittingPolicyRepo.save(
                    petSittingPolicyRepo.create({
                        serviceOfferingId: offering.id,
                        acceptedDogSizes: o.petSittingPolicy.acceptedDogSizes,
                        acceptedCatSizes: o.petSittingPolicy.acceptedCatSizes,
                        acceptedAgeGroups: o.petSittingPolicy.acceptedAgeGroups,
                        acceptsSpecialNeedsPets: o.petSittingPolicy.acceptsSpecialNeedsPets,
                    }),
                );
            }
        }

        created++;
        logger.log(`Created caretaker: ${s.firstName} ${s.lastName} (${s.email})`);
    }

    logger.log(`Seed complete — created: ${created}, updated: ${updated}`);
    logger.log(`Default password for new seeded caretakers: "${DEFAULT_PASSWORD}"`);
    await app.close();
}

bootstrap()
    .then(() => process.exit(0))
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
