import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { CertificateType } from '@pet-care/shared';
import { CaretakerProfile } from '../../entities/caretaker-profile.entity';
import { MediaItem } from '../../../media/entities/media-item.entity';

@Entity('certificates')
@Index('idx_certificates_caretaker', ['caretakerProfileId'])
export class Certificate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => CaretakerProfile, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'caretaker_profile_id' })
    caretakerProfile: CaretakerProfile;

    @Column({ type: 'uuid', name: 'caretaker_profile_id' })
    caretakerProfileId: string;

    @Column({ type: 'enum', enum: CertificateType })
    type: CertificateType;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    // RESTRICT: не дозволяє видалити MediaItem поки існує Certificate.
    // Видалення сертифіката проводиться через CertificatesService.delete,
    // яке прибирає MediaItem після Certificate.
    @ManyToOne(() => MediaItem, { onDelete: 'RESTRICT', eager: true })
    @JoinColumn({ name: 'media_item_id' })
    mediaItem: MediaItem;

    @Column({ type: 'uuid', name: 'media_item_id' })
    mediaItemId: string;

    @CreateDateColumn({ name: 'uploaded_at' })
    uploadedAt: Date;
}
