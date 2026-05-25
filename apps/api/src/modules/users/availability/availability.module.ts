import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaretakerAvailability } from './entities/caretaker-availability.entity';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityRepository } from './availability.repository';
import { UsersModule } from '../users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CaretakerAvailability]),
        forwardRef(() => UsersModule),
    ],
    controllers: [AvailabilityController],
    providers: [AvailabilityService, AvailabilityRepository],
    exports: [AvailabilityService],
})
export class AvailabilityModule {}
