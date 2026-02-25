import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PetsModule } from './modules/pets/pets.module';
import { ServicesModule } from './modules/services/services.module';

@Module({
  imports: [
    // .env файл глобально для всього додатку
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env', // шлях відносно apps/api до кореневого .env
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

    AuthModule,
    UsersModule,
    PetsModule,
    ServicesModule,
  ],
})
export class AppModule {}