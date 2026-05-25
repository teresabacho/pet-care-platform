import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PetsModule } from './modules/pets/pets.module';
import { ServicesModule } from './modules/services/services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { GeoModule } from './modules/geo/geo.module';
import { RedisModule } from './common/redis.module';
import s3Config from './config/s3.config';
import mediaLimitsConfig from './config/media-limits.config';
import { StorageModule } from './modules/storage/storage.module';
import { MediaModule } from './modules/media/media.module';
import { CertificatesModule } from './modules/users/certificates/certificates.module';
import { AvailabilityModule } from './modules/users/availability/availability.module';
import { ChatModule } from './modules/chat/chat.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    RedisModule,

    // .env файл глобально для всього додатку
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env', // шлях відносно apps/api до кореневого .env
      load: [s3Config, mediaLimitsConfig],
    }),

    // підлючення до PostgreSQL через TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // тільки для розробки! Автоматично створює таблиці
      }),
    }),

    StorageModule,
    MediaModule,
    AuthModule,
    UsersModule,
    CertificatesModule,
    AvailabilityModule,
    ChatModule,
    PetsModule,
    ServicesModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
    TrackingModule,
    GeoModule,
  ],
})
export class AppModule {}