import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 8000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: [
      'https://secure-notes-wine-seven.vercel.app',
      frontendUrl,
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  await app.listen(port);
  logger.log(`🚀 Secure Notes API is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
