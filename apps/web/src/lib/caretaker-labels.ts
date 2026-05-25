import {
  AddonPriceUnit,
  AdditionalServiceCapability,
  BirdType,
  CaretakerSkill,
  CatSize,
  DogSize,
  HomeCondition,
  OtherPetType,
  PetAgeGroup,
  PriceUnit,
  RodentType,
  ServiceType,
} from '@pet-care/shared'

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.WALKING]: 'Вигул',
  [ServiceType.PET_SITTING]: 'Догляд вдома у власника',
  [ServiceType.BOARDING]: 'Перетримка у доглядальника',
  [ServiceType.GROOMING]: 'Грумінг',
  [ServiceType.VET_VISIT]: 'Виїзд ветеринара',
}

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  [PriceUnit.PER_SESSION]: 'за сеанс',
  [PriceUnit.PER_HOUR]: 'за годину',
  [PriceUnit.PER_DAY]: 'за добу',
}

export const ADDON_PRICE_UNIT_LABELS: Record<AddonPriceUnit, string> = {
  [AddonPriceUnit.PER_BOOKING]: 'за замовлення',
  [AddonPriceUnit.PER_DAY]: 'за добу',
  [AddonPriceUnit.PER_WALK]: 'за прогулянку',
}

export const DOG_SIZE_LABELS: Record<DogSize, string> = {
  [DogSize.MINI]: 'Міні (до 4 кг)',
  [DogSize.SMALL]: 'Маленький (4–10 кг)',
  [DogSize.MEDIUM]: 'Середній (10–25 кг)',
  [DogSize.LARGE]: 'Великий (25–40 кг)',
  [DogSize.EXTRA_LARGE]: 'Гігант (40+ кг)',
}

export const CAT_SIZE_LABELS: Record<CatSize, string> = {
  [CatSize.SMALL]: 'Маленький (до 3.5 кг)',
  [CatSize.MEDIUM]: 'Середній (3.5–6.5 кг)',
  [CatSize.LARGE]: 'Великий (6.5+ кг)',
}

export const PET_AGE_GROUP_LABELS: Record<PetAgeGroup, string> = {
  [PetAgeGroup.PUPPY_OR_KITTEN]: 'Цуценя/Кошеня',
  [PetAgeGroup.YOUNG]: 'Молодий',
  [PetAgeGroup.ADULT]: 'Дорослий',
  [PetAgeGroup.SENIOR]: 'Поважний вік',
  [PetAgeGroup.ELDERLY]: 'Літній',
}

export const SKILL_LABELS: Record<CaretakerSkill, string> = {
  [CaretakerSkill.INJECTIONS]: 'Уколи',
  [CaretakerSkill.FIRST_AID]: 'Перша допомога',
  [CaretakerSkill.PHOTO_VIDEO_REPORTS]: 'Фото-/відеозвіти',
  [CaretakerSkill.SPECIAL_NEEDS]: 'Особливі потреби',
  [CaretakerSkill.FEEDING_SCHEDULE]: 'Графік годування',
  [CaretakerSkill.DOG_TRAINER]: 'Дресура',
  [CaretakerSkill.POST_SURGERY_CARE]: 'Післяопераційний догляд',
}

export const CAPABILITY_LABELS: Record<AdditionalServiceCapability, string> = {
  [AdditionalServiceCapability.HAS_OWN_TRANSPORT]: 'Маю свій транспорт',
  [AdditionalServiceCapability.PICKUP_DELIVERY]: 'Забрати/привезти',
  [AdditionalServiceCapability.VET_TRANSPORT]: 'Відвезти до ветеринара',
  [AdditionalServiceCapability.GROOMING_BASIC]: 'Базовий грумінг',
}

export const RODENT_TYPE_LABELS: Record<RodentType, string> = {
  [RodentType.HAMSTER]: 'Хом\'як',
  [RodentType.GUINEA_PIG]: 'Морська свинка',
  [RodentType.RAT]: 'Щур',
  [RodentType.MOUSE]: 'Миша',
  [RodentType.RABBIT]: 'Кріль',
  [RodentType.FERRET]: 'Тхір',
  [RodentType.CHINCHILLA]: 'Шиншила',
}

export const BIRD_TYPE_LABELS: Record<BirdType, string> = {
  [BirdType.PARROT]: 'Папуга',
  [BirdType.BUDGERIGAR]: 'Хвилястий папужка',
  [BirdType.COCKATIEL]: 'Корелла',
  [BirdType.CANARY]: 'Канарка',
  [BirdType.FINCH]: 'Амадина',
  [BirdType.OTHER_BIRD]: 'Інша',
}

export const OTHER_PET_TYPE_LABELS: Record<OtherPetType, string> = {
  [OtherPetType.TURTLE]: 'Черепаха',
  [OtherPetType.FISH]: 'Рибки',
  [OtherPetType.SNAKE]: 'Змія',
  [OtherPetType.LIZARD]: 'Ящірка',
  [OtherPetType.OTHER]: 'Інша',
}

export const HOME_CONDITION_LABELS: Record<HomeCondition, string> = {
  [HomeCondition.APARTMENT]: 'Квартира',
  [HomeCondition.HOUSE]: 'Будинок',
  [HomeCondition.HAS_BALCONY]: 'Є балкон',
  [HomeCondition.NO_BALCONY]: 'Без балкона',
  [HomeCondition.HAS_YARD]: 'Є двір',
  [HomeCondition.NO_YARD]: 'Без двору',
  [HomeCondition.HAS_SEPARATE_PET_AREA]: 'Окрема зона для тваринки',
  [HomeCondition.NO_SEPARATE_PET_AREA]: 'Немає окремої зони',
  [HomeCondition.PETS_ON_FURNITURE_ALLOWED]: 'Можна на меблі',
  [HomeCondition.PETS_ON_FURNITURE_FORBIDDEN]: 'Не можна на меблі',
  [HomeCondition.PETS_ON_BED_ALLOWED]: 'Можна на ліжко',
  [HomeCondition.PETS_ON_BED_FORBIDDEN]: 'Не можна на ліжко',
  [HomeCondition.SMOKE_FREE]: 'Без диму',
  [HomeCondition.HAS_SMOKERS]: 'Є курці',
  [HomeCondition.NO_KIDS]: 'Без дітей',
  [HomeCondition.HAS_KIDS]: 'Є діти',
  [HomeCondition.NO_OTHER_PETS]: 'Без інших тварин',
  [HomeCondition.HAS_OTHER_PETS]: 'Є інші тварини',
}
