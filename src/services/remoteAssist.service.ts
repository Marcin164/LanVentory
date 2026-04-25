import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, randomBytes } from 'crypto';
import { Devices } from 'src/entities/devices.entity';
import { AuditService } from 'src/services/audit.service';

const SESSION_TTL_MS = 5 * 60 * 1000;

/**
 * Thin integration with whichever remote-assist tool you front (RustDesk,
 * AnyDesk, MeshCentral, ScreenConnect). We only generate a one-time
 * signed connection URL — the actual session is orchestrated by the
 * external tool.
 *
 * Required env to make this live:
 *   REMOTE_ASSIST_BASE_URL    e.g. https://remote.example.com/connect
 *   REMOTE_ASSIST_TOKEN_SECRET shared HMAC secret
 *
 * Without those the endpoint returns 503 — agents see a clear message,
 * nothing happens silently.
 */
@Injectable()
export class RemoteAssistService {
  private readonly logger = new Logger(RemoteAssistService.name);

  constructor(
    @InjectRepository(Devices)
    private readonly devices: Repository<Devices>,
    private readonly audit: AuditService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      process.env.REMOTE_ASSIST_BASE_URL &&
        process.env.REMOTE_ASSIST_TOKEN_SECRET,
    );
  }

  async startSession(input: {
    deviceId: string;
    actorId: string;
    ticketId?: string | null;
  }) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Remote assist is not configured. Set REMOTE_ASSIST_BASE_URL and REMOTE_ASSIST_TOKEN_SECRET.',
      );
    }

    const device = await this.devices.findOneBy({ id: input.deviceId });
    if (!device) throw new NotFoundException('Device not found');

    const baseUrl = process.env.REMOTE_ASSIST_BASE_URL!;
    const secret = process.env.REMOTE_ASSIST_TOKEN_SECRET!;
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const nonce = randomBytes(8).toString('hex');

    const params = new URLSearchParams({
      deviceId: device.id,
      assetName: device.assetName ?? '',
      actor: input.actorId,
      exp: String(expiresAt.getTime()),
      nonce,
    });
    if (input.ticketId) params.set('ticketId', input.ticketId);

    const sig = createHmac('sha256', secret)
      .update(params.toString())
      .digest('hex');
    params.set('sig', sig);

    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`;

    await this.audit.log('Device', device.id, 'remote_session_started', {
      actor: input.actorId,
      ticketId: input.ticketId ?? null,
      expiresAt,
      nonce,
    });

    return {
      url,
      expiresAt,
      ttlSeconds: Math.round(SESSION_TTL_MS / 1000),
    };
  }
}
