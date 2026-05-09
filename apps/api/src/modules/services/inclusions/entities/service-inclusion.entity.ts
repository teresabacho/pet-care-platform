import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceOffering } from '../../entities/service-offering.entity';

// «Що входить у вартість» — окремі чек-пункти, які caretaker додає
// з шаблонних пропозицій або вписує самостійно. Зберігаються
// нормалізовано (а не одним текстовим полем у description), щоб
// клієнт у пошуку міг фільтрувати offerings за наявністю конкретних
// пунктів — наприклад «GPS-трек» або «фото-звіт».
@Entity('service_inclusions')
@Index('idx_inclusion_offering', ['serviceOfferingId'])
export class ServiceInclusion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ServiceOffering, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'service_offering_id' })
    serviceOffering: ServiceOffering;

    @Column({ type: 'uuid', name: 'service_offering_id' })
    serviceOfferingId: string;

    @Column({ type: 'varchar', length: 255 })
    text: string;

    @Column({ type: 'int', default: 0, name: 'order_index' })
    orderIndex: number;
}
