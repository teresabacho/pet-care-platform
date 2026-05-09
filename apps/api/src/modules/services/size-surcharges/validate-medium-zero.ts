import { BadRequestException } from '@nestjs/common';

interface SurchargeShape {
    petSpecies: 'DOG' | 'CAT';
    size: string;
    surchargeAmount: number | string;
}

// MEDIUM — базова категорія для basePrice. Будь-яке ненульове surchargeAmount
// для MEDIUM свідчить про помилку в логіці doglядальника.
export function assertMediumSurchargeIsZero(items: ReadonlyArray<SurchargeShape>): void {
    for (const item of items) {
        if (item.size === 'MEDIUM' && Number(item.surchargeAmount) !== 0) {
            throw new BadRequestException(
                `Для базового розміру MEDIUM (${item.petSpecies}) surchargeAmount має дорівнювати 0`,
            );
        }
    }
}
