import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './entities/certificate.entity';

@Injectable()
export class CertificatesRepository {
    constructor(
        @InjectRepository(Certificate)
        private readonly repo: Repository<Certificate>,
    ) {}

    findByCaretakerProfileId(caretakerProfileId: string): Promise<Certificate[]> {
        return this.repo.find({
            where: { caretakerProfileId },
            order: { uploadedAt: 'DESC' },
            relations: ['mediaItem'],
        });
    }

    findById(id: string): Promise<Certificate | null> {
        return this.repo.findOne({ where: { id } });
    }

    create(data: Partial<Certificate>): Promise<Certificate> {
        const cert = this.repo.create(data);
        return this.repo.save(cert);
    }

    async delete(id: string): Promise<void> {
        await this.repo.delete(id);
    }

    countByCaretakerProfileId(caretakerProfileId: string): Promise<number> {
        return this.repo.count({ where: { caretakerProfileId } });
    }
}
