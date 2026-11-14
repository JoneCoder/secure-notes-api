import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express, { Express, Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';

let cachedServer: Express;

async function bootstrapServer(): Promise<Express> {
  if (!cachedServer) {
    const expressApp = express();

    // Friendly root response for root visits
    expressApp.get('/', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: 'secure-notes-api',
        message: 'Secure Notes API is running on Vercel',
        endpoints: {
          health: '/api/v1',
          auth: '/api/v1/auth',
          notes: '/api/v1/notes',
          users: '/api/v1/users',
          admin: '/api/v1/admin',
        },
      });
    });

    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    nestApp.setGlobalPrefix('api/v1');

    nestApp.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    nestApp.useGlobalFilters(new GlobalHttpExceptionFilter());

    await nestApp.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  const server = await bootstrapServer();
  return server(req, res);
}
