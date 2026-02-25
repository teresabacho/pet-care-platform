import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServicesRepository } from './services.repository';
import { ServiceOffering } from './entities/service-offering.entity';
import { CaretakerProfile } from '../users/entities/caretaker-profile.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ServiceOffering, CaretakerProfile])],
    controllers: [ServicesController],
    providers: [ServicesService, ServicesRepository],
    exports: [ServicesService],
})
export class ServicesModule {}
