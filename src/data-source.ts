import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env so TypeORM CLI works the same way as `nest start`.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Standalone DataSource used by the TypeORM CLI for migrations:
 *   npm run migration:generate -- src/migrations/<name>
 *   npm run migration:run
 *   npm run migration:revert
 *
 * Mirrors the runtime config in app.module.ts. The entity glob includes
 * compiled and source files so it works pre- and post-build.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA || 'public',
  entities: [path.join(__dirname, 'entities', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
});
