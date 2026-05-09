import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from './entities/certificate.entity';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificatesRepository } from './certificates.repository';
import { UsersModule } from '../users.module';
import { MediaModule } from '../../media/media.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Certificate]),
        // forwardRef — UsersModule і MediaModule вже взаємопов'язані;
        // CertificatesModule сидить між ними.
        forwardRef(() => UsersModule),
        forwardRef(() => MediaModule),
    ],
    controllers: [CertificatesController],
    providers: [CertificatesService, CertificatesRepository],
    exports: [CertificatesService],
})
export class CertificatesModule {}
