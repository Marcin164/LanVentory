import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { initBaseAuth } from '@propelauth/node';

const { fetchUserMfaMethods } = initBaseAuth({
  authUrl: 'https://3187297.propelauthtest.com',
  apiKey:
    '0748e2c0b528c828501effb1d3e42bced3af1a9b51047c586a101715ce367db978f52483b7d686bf22438f029911a9b7',
});

type CacheEntry = { hasMfa: boolean; expiresAt: number };
const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

/**
 * Requires the caller to have MFA enabled when MFA_REQUIRED=true.
 * Apply on sensitive endpoints (audit, retention, evidence pack, privacy,
 * role assignment). Off by default so dev flow isn't broken; flip the env
 * var in production deployments.
 *
 * Caches the PropelAuth lookup for 5 min per user to keep latency acceptable.
 */
@Injectable()
export class MfaGuard implements CanActivate {
  private readonly logger = new Logger(MfaGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.MFA_REQUIRED !== 'true') return true;

    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req?.user?.userId ?? req?.user?.id;
    if (!userId) {
      throw new ForbiddenException('User context missing for MFA check');
    }

    const cached = cache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      if (!cached.hasMfa) throw this.mfaRequired();
      return true;
    }

    let hasMfa = false;
    try {
      const methods = await fetchUserMfaMethods(userId);
      hasMfa = Boolean(
        methods &&
          ((methods as any).backupCodesEnabled ||
            (methods as any).totpEnabled ||
            (methods as any).smsEnabled ||
            (Array.isArray((methods as any).methods) &&
              (methods as any).methods.length > 0)),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to fetch MFA methods for ${userId}; failing closed`,
      );
      throw this.mfaRequired();
    }

    cache.set(userId, { hasMfa, expiresAt: now + TTL_MS });
    if (!hasMfa) throw this.mfaRequired();
    return true;
  }

  private mfaRequired() {
    return new ForbiddenException(
      'Multi-factor authentication is required for this endpoint. Enable MFA in your account settings.',
    );
  }
}
