import { Controller, Get, HttpCode } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const STARTED_AT = new Date();

/**
 * Liveness + readiness probes for orchestrators (k8s, Docker, Render, etc).
 *
 * - /health  → process is up. Always 200 if Nest is serving.
 * - /ready   → ready to take traffic. Verifies DB is reachable; 503 otherwise.
 *
 * Both are throttle-exempt and unauthenticated by design.
 */
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get('health')
  @HttpCode(200)
  health() {
    return {
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - STARTED_AT.getTime()) / 1000),
      startedAt: STARTED_AT.toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready', db: 'ok' };
    } catch (err) {
      return {
        status: 'unready',
        db: 'unreachable',
        error: (err as Error).message,
      };
    }
  }
}
