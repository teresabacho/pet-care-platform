import { validateSync } from 'class-validator';
import { HomeCondition } from '@pet-care/shared';
import { NoConflictingHomeConditions } from './no-conflicting-home-conditions.validator';

class TestDto {
    @NoConflictingHomeConditions()
    homeConditions: HomeCondition[] = [];
}

describe('NoConflictingHomeConditions', () => {
    it('passes for empty array', () => {
        const dto = new TestDto();
        dto.homeConditions = [];
        expect(validateSync(dto)).toEqual([]);
    });

    it('passes for non-conflicting conditions', () => {
        const dto = new TestDto();
        dto.homeConditions = [
            HomeCondition.HAS_BALCONY,
            HomeCondition.SMOKE_FREE,
            HomeCondition.NO_KIDS,
        ];
        expect(validateSync(dto)).toEqual([]);
    });

    it('fails when both members of a pair are present', () => {
        const dto = new TestDto();
        dto.homeConditions = [HomeCondition.HAS_KIDS, HomeCondition.NO_KIDS];
        const errors = validateSync(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.noConflictingHomeConditions).toContain('HAS_KIDS');
    });

    it('fails for multiple conflicts', () => {
        const dto = new TestDto();
        dto.homeConditions = [
            HomeCondition.APARTMENT,
            HomeCondition.HOUSE,
            HomeCondition.SMOKE_FREE,
            HomeCondition.HAS_SMOKERS,
        ];
        const errors = validateSync(dto);
        expect(errors).toHaveLength(1);
    });
});
