import { ApiProperty } from '@nestjs/swagger';
import {
    IsIn,
    IsNumber,
    IsString,
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';
import { CatSize, DogSize } from '@pet-care/shared';

const DOG_SIZES = Object.values(DogSize) as string[];
const CAT_SIZES = Object.values(CatSize) as string[];

// Кастомний валідатор: значення `size` має належати DogSize якщо petSpecies='DOG',
// або CatSize якщо petSpecies='CAT'.
function IsValidSizeForSpecies(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isValidSizeForSpecies',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown, args: ValidationArguments) {
                    const dto = args.object as { petSpecies?: string };
                    if (typeof value !== 'string') return false;
                    if (dto.petSpecies === 'DOG') return DOG_SIZES.includes(value);
                    if (dto.petSpecies === 'CAT') return CAT_SIZES.includes(value);
                    return false;
                },
                defaultMessage(args: ValidationArguments) {
                    const dto = args.object as { petSpecies?: string };
                    const allowed = dto.petSpecies === 'CAT' ? CAT_SIZES : DOG_SIZES;
                    return `${args.property} має бути одним з ${allowed.join(', ')} для виду ${dto.petSpecies}`;
                },
            },
        });
    };
}

export class CreateSizeSurchargeDto {
    @ApiProperty({ enum: ['DOG', 'CAT'] })
    @IsIn(['DOG', 'CAT'])
    petSpecies: 'DOG' | 'CAT';

    @ApiProperty({ description: 'DogSize або CatSize як рядок' })
    @IsString()
    @IsValidSizeForSpecies()
    size: string;

    @ApiProperty({
        description:
            'Дельта до basePrice. 0 для MEDIUM, від\'ємна для менших розмірів, додатня для більших.',
    })
    @IsNumber()
    surchargeAmount: number;
}
