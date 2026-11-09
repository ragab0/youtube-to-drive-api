import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import cookieSession from 'cookie-session';

async function bootstrap() {
  // 0. init an app instance
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: true,
  });

  // 1. setup configuraiton && loggers && our main prefix
  const configService = app.get(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.setGlobalPrefix('api');

  // 2. Cookie session
  const secretKey = configService.get<string>('SECRET_KEY')!;
  const oauthRedirectUri = configService.get<string>('OAUTH_REDIRECT_URI')!;
  const isSecure = oauthRedirectUri.startsWith('https://');

  app.use(
    cookieSession({
      name: 'sid',
      keys: [secretKey],
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    }),
  );

  // -- Graceful shutdown
  app.enableShutdownHooks();

  // -- Start the application
  const port = configService.get<number>('PORT') || 8080;
  await app.listen(port);
  logger.log(`Application is running on port: ${port}`);
}

await bootstrap();
