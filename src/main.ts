import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // 1.2 CORS
  console.log(
    '##############################',
    configService.getOrThrow<string>('FRONTEND_URL'),
  );

  app.enableCors({
    origin: configService.getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
  });

  // 1.5 Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('YouTube to Google Drive API')
    .setDescription(
      'Transfer your favorite YouTube videos directly to Google Drive',
    )
    .setVersion('1.0')
    .addCookieAuth('sid')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

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
