import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { randomUUID } from 'crypto';

function buildCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return false; // no cross-origin allowed by default
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['log', 'warn', 'error']
        : ['log', 'warn', 'error', 'debug'],
  });

  // Request ID middleware — propagate X-Request-Id from caller or generate
  // one. Lets us correlate logs/audit across services.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const id =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    (req as any).requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  });

  // Security headers — sane defaults from helmet. CSP is left to the reverse
  // proxy / static host because the SPA configures its own.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const corsOrigins = buildCorsOrigins();
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Request-Id',
      'X-Device-Id',
      'X-Timestamp',
      'X-Nonce',
      'X-Signature',
    ],
    exposedHeaders: ['X-Request-Id', 'X-Report-Sha256'],
  });

  app.use(
    json({
      limit: '50mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  logger.log(
    `LanVentory API listening on :${port} (env=${process.env.NODE_ENV ?? 'unset'})`,
  );
  if (corsOrigins === false) {
    logger.warn(
      'CORS_ORIGINS not set — cross-origin requests will be rejected. Set it in .env to allow your frontend.',
    );
  } else {
    logger.log(`CORS allowed origins: ${(corsOrigins as string[]).join(', ')}`);
  }
}
bootstrap();
