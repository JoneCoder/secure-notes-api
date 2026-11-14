import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express, { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';

let cachedApp: express.Application | null = null;

async function bootstrapServer(): Promise<express.Application> {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();

  // Root welcoming endpoint
  expressApp.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'secure-notes-api',
      message: 'Secure Notes API is running live on Vercel',
      version: '1.0.0',
      endpoints: {
        health: '/api/v1',
        auth: '/api/v1/auth',
        notes: '/api/v1/notes',
        users: '/api/v1/users',
        admin: '/api/v1/admin',
      },
    });
  });

  // /api redirect to /api/v1
  expressApp.get('/api', (_req: Request, res: Response) => {
    res.redirect('/api/v1');
  });

  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  // Set global prefix to api/v1, excluding root '/'
  nestApp.setGlobalPrefix('api/v1', {
    exclude: ['/'],
  });

  // Allowed origins for CORS
  const allowedOrigins = [
    'https://secure-notes-wine-seven.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8000',
  ];
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
  }

  nestApp.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      try {
        const url = new URL(origin);
        if (
          allowedOrigins.includes(cleanOrigin) ||
          url.hostname.endsWith('.vercel.app') ||
          url.hostname === 'localhost'
        ) {
          return callback(null, true);
        }
      } catch {
        // invalid URL fallback
      }
      return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
    ],
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
  cachedApp = expressApp;
  return cachedApp;
}

export default async function handler(req: Request, res: Response) {
  try {
    const server = await bootstrapServer();
    server(req, res);
  } catch (err: any) {
    console.error('Serverless Bootstrap Error:', err);
    res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: err.message || 'Failed to initialize serverless application',
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  }
}
