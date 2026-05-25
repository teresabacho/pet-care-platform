import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';
import { HOME_CONDITION_CONFLICTS, HomeCondition } from '@pet-care/shared';

// Перевіряє, що жодна пара з HOME_CONDITION_CONFLICTS не присутня одночасно
// у масиві homeConditions. Caretaker може не вказувати ознаку взагалі,
// але якщо вже сказав «без двору» — не може одночасно сказати «з двором».
export function NoConflictingHomeConditions(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'noConflictingHomeConditions',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown): boolean {
                    if (!Array.isArray(value)) return true; // інші декоратори впораються
                    const set = new Set<string>(value as string[]);
                    for (const [a, b] of HOME_CONDITION_CONFLICTS) {
                        if (set.has(a) && set.has(b)) return false;
                    }
                    return true;
                },
                defaultMessage(args: ValidationArguments): string {
                    const value = args.value as HomeCondition[];
                    const set = new Set(value);
                    const conflicts = HOME_CONDITION_CONFLICTS.filter(
                        ([a, b]) => set.has(a) && set.has(b),
                    );
                    return `Конфліктні пари homeConditions: ${conflicts
                        .map(([a, b]) => `${a}↔${b}`)
                        .join(', ')}`;
                },
            },
        });
    };
}
