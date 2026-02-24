import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';

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
        synchronize: true, // ⚠️ тільки для розробки! Автоматично створює таблиці
        logging: true,     // виводить SQL запити в консоль (зручно для дебагу)
      }),
    }),

    AuthModule,
  ],
})
export class AppModule {}