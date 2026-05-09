import { ServiceType } from '../index';

// Які види тваринок можна приймати на кожен тип послуги. WALKING/GROOMING —
// фізично лише собаки/коти. Інші послуги — будь-які з підтримуваних.
export type SupportedSpecies = 'DOG' | 'CAT' | 'RODENT' | 'BIRD' | 'OTHER';

export const ALLOWED_SPECIES_FOR_SERVICE: Record<ServiceType, SupportedSpecies[]> = {
    [ServiceType.WALKING]: ['DOG', 'CAT'],
    [ServiceType.PET_SITTING]: ['DOG', 'CAT', 'RODENT', 'BIRD', 'OTHER'],
    [ServiceType.BOARDING]: ['DOG', 'CAT', 'RODENT', 'BIRD', 'OTHER'],
    [ServiceType.GROOMING]: ['DOG', 'CAT'],
    [ServiceType.VET_VISIT]: ['DOG', 'CAT', 'RODENT', 'BIRD', 'OTHER'],
};

export const SPECIES_LABELS: Record<SupportedSpecies, string> = {
    DOG: 'Собаки',
    CAT: 'Коти',
    RODENT: 'Гризуни',
    BIRD: 'Птахи',
    OTHER: 'Інші',
};
