import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConditionalModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ConfigModule as AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { YoutubeModule } from './youtube/youtube.module.js';
import { User } from './users/user.entity.js';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { HealthModule } from './health/health.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    AppConfigModule,
    DevtoolsModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        http: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    ConditionalModule.registerWhen(
      HealthModule,
      (env) => env.NODE_ENV === 'production',
    ),
    // ObserveModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     appKey: config.get<string>('OBSERVE_APP_KEY'),
    //     appSecret: config.get<string>('OBSERVE_APP_SECRET'),
    //     serviceId: 'yt-2-drive',
    //   }),
    // }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          transport:
            config.get<string>('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty' }
              : undefined,
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isNeon = config.get<string>('DB_PROVIDER') === 'neon';
        return {
          type: 'postgres',
          url: config.getOrThrow<string>('DATABASE_URL'),
          entities: [User],
          synchronize: config.get<string>('NODE_ENV') === 'development',
          ssl: isNeon ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    DatabaseModule,
    YoutubeModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
