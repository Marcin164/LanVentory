import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Devices } from 'src/entities/devices.entity';

const MAX_DRIFT_MS = 5 * 60 * 1000;
const NONCE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AgentGuard implements CanActivate {
  private readonly logger = new Logger(AgentGuard.name);
  private readonly nonceCache = new Map<string, number>();
  private lastSweep = 0;

  constructor(
    @InjectRepository(Devices)
    private readonly devicesRepository: Repository<Devices>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const deviceId = req.headers['x-device-id'];
    const timestamp = req.headers['x-timestamp'];
    const nonce = req.headers['x-nonce'];
    const signature = req.headers['x-signature'];

    if (
      typeof deviceId !== 'string' ||
      typeof timestamp !== 'string' ||
      typeof nonce !== 'string' ||
      typeof signature !== 'string'
    ) {
      throw new UnauthorizedException('Missing agent auth headers');
    }

    const ts = Date.parse(timestamp);
    if (Number.isNaN(ts) || Math.abs(Date.now() - ts) > MAX_DRIFT_MS) {
      throw new UnauthorizedException('Timestamp outside drift window');
    }

    this.sweepNonces();
    const nonceKey = `${deviceId}:${nonce}`;
    if (this.nonceCache.has(nonceKey)) {
      throw new UnauthorizedException('Nonce already used');
    }

    const device = await this.devicesRepository.findOneBy({ id: deviceId });
    if (!device || (!device.apiSecretHash && !device.apiSecretHashPrev)) {
      throw new UnauthorizedException('Device not enrolled');
    }

    const rawBody: Buffer | undefined = (req as any).rawBody;
    const bodyString = rawBody
      ? rawBody.toString('utf8')
      : JSON.stringify(req.body ?? {});

    const matched = await this.matchSignature(
      device,
      timestamp,
      nonce,
      bodyString,
      signature,
    );
    if (!matched) {
      throw new UnauthorizedException('Invalid signature');
    }

    this.nonceCache.set(nonceKey, Date.now() + NONCE_TTL_MS);
    (req as any).agentDevice = device;
    return true;
  }

  private async matchSignature(
    device: Devices,
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
  ): Promise<boolean> {
    const candidates: string[] = [];
    if (device.apiSecretHash) candidates.push(device.apiSecretHash);
    if (
      device.apiSecretHashPrev &&
      device.apiSecretPrevValidUntil &&
      device.apiSecretPrevValidUntil.getTime() > Date.now()
    ) {
      candidates.push(device.apiSecretHashPrev);
    }

    const sigBuf = Buffer.from(signature, 'hex');
    if (sigBuf.length === 0) return false;

    for (const secretHash of candidates) {
      const expected = createHmac('sha256', secretHash)
        .update(`${timestamp}|${nonce}|${body}`)
        .digest();
      if (
        expected.length === sigBuf.length &&
        timingSafeEqual(expected, sigBuf)
      ) {
        return true;
      }
    }
    return false;
  }

  private sweepNonces() {
    const now = Date.now();
    if (now - this.lastSweep < 60_000) return;
    for (const [k, exp] of this.nonceCache) {
      if (exp < now) this.nonceCache.delete(k);
    }
    this.lastSweep = now;
  }
}

export const hashAgentSecret = (secret: string) =>
  createHash('sha256').update(secret).digest('hex');
