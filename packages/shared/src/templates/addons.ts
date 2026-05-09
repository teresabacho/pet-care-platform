import { AddonPriceUnit, ServiceType } from '../index';

// Пропозиції додаткових послуг. Caretaker натискає → додається з префілом,
// ціну може змінити. Об'єднує те, що було в ADDON_SUGGESTIONS (форма) і
// ADDITIONAL_LIBRARY (відображення на профілі) — щоб не було розбіжностей
// між тим, що caretaker налаштовує, і тим, що бачить клієнт.
export interface AddonTemplate {
    name: string;
    description: string;
    defaultPrice: number;
    defaultPriceUnit: AddonPriceUnit;
    /** Якщо вказано — пропозиція показується тільки для цих типів послуг. */
    serviceTypes?: ServiceType[];
}

export const ADDON_TEMPLATES: AddonTemplate[] = [
    // ─────────── WALKING ───────────
    {
        name: 'Помити лапи після прогулянки',
        description: 'Швидке миття лап і обтирання після виходу',
        defaultPrice: 50,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.WALKING, ServiceType.PET_SITTING, ServiceType.BOARDING],
    },
    {
        name: 'Гра з улюбленими іграшками',
        description: 'Принести і використати під час прогулянки',
        defaultPrice: 50,
        defaultPriceUnit: AddonPriceUnit.PER_WALK,
        serviceTypes: [ServiceType.WALKING],
    },
    {
        name: 'Принесу смаколики',
        description: 'За попередньою згодою з власником',
        defaultPrice: 50,
        defaultPriceUnit: AddonPriceUnit.PER_WALK,
        serviceTypes: [ServiceType.WALKING],
    },
    {
        name: 'Прогулянка з другою тваринкою',
        description: 'Тваринкою власника тієї ж родини',
        defaultPrice: 100,
        defaultPriceUnit: AddonPriceUnit.PER_WALK,
        serviceTypes: [ServiceType.WALKING],
    },
    {
        name: 'Базова дресура під час прогулянки',
        description: 'Базові команди (сидіти, лежати, до мене)',
        defaultPrice: 150,
        defaultPriceUnit: AddonPriceUnit.PER_WALK,
        serviceTypes: [ServiceType.WALKING, ServiceType.PET_SITTING],
    },

    // ─────────── PET SITTING ───────────
    {
        name: 'Годування за графіком',
        description: 'Декілька разів на день за вказаним графіком',
        defaultPrice: 100,
        defaultPriceUnit: AddonPriceUnit.PER_DAY,
        serviceTypes: [ServiceType.PET_SITTING, ServiceType.BOARDING],
    },
    {
        name: 'Додаткова прогулянка',
        description: 'Понад звичайний графік',
        defaultPrice: 200,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.PET_SITTING, ServiceType.BOARDING],
    },
    {
        name: 'Уколи / медикаменти',
        description: 'Підшкірні уколи, дача таблеток за призначенням',
        defaultPrice: 80,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.PET_SITTING, ServiceType.BOARDING],
    },
    {
        name: 'Чистка лотка',
        description: 'Щоденна чистка котячого туалету',
        defaultPrice: 30,
        defaultPriceUnit: AddonPriceUnit.PER_DAY,
        serviceTypes: [ServiceType.PET_SITTING, ServiceType.BOARDING],
    },
    {
        name: 'Розчісування шерсті',
        description: 'Щоденне розчісування довгошерстої тваринки',
        defaultPrice: 100,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.PET_SITTING, ServiceType.BOARDING, ServiceType.GROOMING],
    },
    {
        name: 'Полив квітів',
        description: 'Догляд за рослинами під час вашої відсутності',
        defaultPrice: 50,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.PET_SITTING],
    },
    {
        name: 'Прибирання після тваринки',
        description: 'Прибирання слідів за тваринкою',
        defaultPrice: 150,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.PET_SITTING],
    },

    // ─────────── BOARDING ───────────
    {
        name: 'Окрема кімната',
        description: 'Окрема кімната, не сумісне утримання',
        defaultPrice: 150,
        defaultPriceUnit: AddonPriceUnit.PER_DAY,
        serviceTypes: [ServiceType.BOARDING],
    },
    {
        name: 'Купання перед поверненням',
        description: 'Освіжаюче купання у день закінчення передержки',
        defaultPrice: 250,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.BOARDING],
    },
    {
        name: 'Вечірня телефонна розмова з власником',
        description: 'Звіт по телефону / відео-звʼязок щодня',
        defaultPrice: 50,
        defaultPriceUnit: AddonPriceUnit.PER_DAY,
        serviceTypes: [ServiceType.BOARDING],
    },

    // ─────────── GROOMING ───────────
    {
        name: 'Розплутування ковтунів',
        description: 'Дбайливе розплутування без стрижки під 0',
        defaultPrice: 200,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.GROOMING],
    },
    {
        name: 'Чистка зубів',
        description: 'Профілактична чистка',
        defaultPrice: 150,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.GROOMING, ServiceType.VET_VISIT],
    },
    {
        name: 'Бантик / краватка',
        description: 'Декоративний акцент після грумінгу',
        defaultPrice: 50,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.GROOMING],
    },
    {
        name: 'Парфумування гіпоалергенне',
        description: 'Легкий аромат після купання',
        defaultPrice: 50,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.GROOMING],
    },
    {
        name: 'Догляд за анальними залозами',
        description: 'Профілактична чистка',
        defaultPrice: 200,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.GROOMING, ServiceType.VET_VISIT],
    },

    // ─────────── VET VISIT ───────────
    {
        name: 'Внутрішньомʼязовий укол',
        description: 'Підшкірний / внутрішньомʼязовий ін\'єкція',
        defaultPrice: 200,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.VET_VISIT, ServiceType.PET_SITTING, ServiceType.BOARDING],
    },
    {
        name: 'Забір крові на аналіз',
        description: 'Доставка зразка у партнерську лабораторію',
        defaultPrice: 300,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.VET_VISIT],
    },
    {
        name: 'Чіп-сканування',
        description: 'Перевірка наявності та зчитування мікрочіпа',
        defaultPrice: 100,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.VET_VISIT],
    },
    {
        name: 'Обробка ран',
        description: 'Промивання, перевʼязка',
        defaultPrice: 250,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.VET_VISIT, ServiceType.PET_SITTING, ServiceType.BOARDING],
    },
    {
        name: 'Консультація щодо раціону',
        description: 'Підбір корму, особливості харчування',
        defaultPrice: 200,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.VET_VISIT],
    },

    // ─────────── Спільні (ALL) ───────────
    {
        name: 'Додаткова тваринка',
        description: 'Якщо у вас більше однієї тваринки одного господаря',
        defaultPrice: 100,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
    },
    {
        name: 'Фото-/відеозвіт',
        description: 'Звіт із прогулянки/перебування з фото та коротким відео',
        defaultPrice: 50,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
    },
    {
        name: 'Забрати/привезти тваринку',
        description: 'Замість того щоб приходити чи привозити — заберу і поверну. Ціна залежить від відстані; уточнюйте.',
        defaultPrice: 200,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
    },
    {
        name: 'Відвезти до ветеринара',
        description: 'Виїзд до ветклініки за потреби. Ціна обговорюється окремо.',
        defaultPrice: 300,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
    },
    {
        name: 'Базовий грумінг',
        description: 'Розчісування, чистка вух, підрізання кігтів. Без купання/стрижки.',
        defaultPrice: 150,
        defaultPriceUnit: AddonPriceUnit.PER_BOOKING,
        serviceTypes: [ServiceType.PET_SITTING, ServiceType.BOARDING, ServiceType.GROOMING],
    },
];
