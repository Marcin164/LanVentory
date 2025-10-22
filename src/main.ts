import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(json({ limit: '1000mb' }));
  app.use(urlencoded({ extended: true, limit: '1000mb' }));
  await app.listen(3000);
}
bootstrap();
