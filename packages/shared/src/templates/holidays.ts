// Державні свята України (за новим календарем). Без 7 січня — святкуємо
// Різдво 25 грудня. Великдень — рухоме свято; захардкоджені дати на 5 років
// наперед, далі — оновлення цього файлу.
//
// `month`/`day` — у локальному часі (1-індекс). `isUkrainianHoliday(date)`
// перевіряє статичний список + Великдень + Трійцю (Великдень + 49 днів).

interface FixedHoliday {
    month: number;
    day: number;
    name: string;
}

export const UKRAINIAN_FIXED_HOLIDAYS: FixedHoliday[] = [
    { month: 1, day: 1, name: 'Новий рік' },
    { month: 3, day: 8, name: 'Міжнародний жіночий день' },
    { month: 5, day: 1, name: 'День праці' },
    { month: 5, day: 9, name: 'День памʼяті та перемоги' },
    { month: 6, day: 28, name: 'День Конституції' },
    { month: 7, day: 15, name: 'День Української Державності' },
    { month: 8, day: 24, name: 'День Незалежності' },
    { month: 10, day: 1, name: 'День захисників і захисниць' },
    { month: 12, day: 25, name: 'Різдво Христове' },
];

// Великдень за новоюліанським календарем — узгоджено з рішенням ПЦУ
// перейти на нову дату (та сама, що в західних церквах). Hardcode на
// 2025-2030; коли наблизимось до межі — додати ще роки або реалізувати
// формулу Гаусса.
export const UKRAINIAN_PASCHA: Record<number, { month: number; day: number }> = {
    2025: { month: 4, day: 20 },
    2026: { month: 4, day: 5 },
    2027: { month: 3, day: 28 },
    2028: { month: 4, day: 16 },
    2029: { month: 4, day: 1 },
    2030: { month: 4, day: 21 },
};

function addDays(year: number, month1: number, day: number, days: number): { month: number; day: number } {
    const d = new Date(year, month1 - 1, day);
    d.setDate(d.getDate() + days);
    return { month: d.getMonth() + 1, day: d.getDate() };
}

export function isUkrainianHoliday(date: Date): boolean {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    if (UKRAINIAN_FIXED_HOLIDAYS.some((h) => h.month === month && h.day === day)) {
        return true;
    }

    const pascha = UKRAINIAN_PASCHA[year];
    if (pascha) {
        if (pascha.month === month && pascha.day === day) return true;
        // Трійця — Великдень + 49 днів (нерухоме у тому ж році)
        const trinity = addDays(year, pascha.month, pascha.day, 49);
        if (trinity.month === month && trinity.day === day) return true;
    }

    return false;
}
