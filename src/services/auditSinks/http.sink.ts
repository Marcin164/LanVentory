import { Logger } from '@nestjs/common';
import { AuditRecord, AuditSink, SinkStatus } from './sink.interface';

type Format = 'generic' | 'splunk' | 'datadog' | 'loki';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class HttpAuditSink implements AuditSink {
  readonly name = 'http';
  readonly enabled: boolean;
  private readonly logger = new Logger(HttpAuditSink.name);
  private readonly url: string | null;
  private readonly token: string | null;
  private readonly format: Format;
  private readonly queueMax: number;
  private readonly queue: AuditRecord[] = [];
  private sentTotal = 0;
  private failedTotal = 0;
  private droppedTotal = 0;
  private lastError: string | null = null;
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;
  private running = false;
  private stopping = false;
  private loopPromise: Promise<void> | null = null;

  constructor() {
    this.url = process.env.AUDIT_SINK_URL ?? null;
    this.token = process.env.AUDIT_SINK_TOKEN ?? null;
    this.format = this.parseFormat(process.env.AUDIT_SINK_FORMAT);
    this.queueMax = Math.max(
      Number(process.env.AUDIT_SINK_QUEUE_MAX) || 1000,
      10,
    );
    this.enabled = Boolean(this.url);
    if (this.enabled) {
      this.logger.log(
        `HTTP sink active → ${this.url} (format=${this.format}, queueMax=${this.queueMax})`,
      );
      this.start();
    }
  }

  private parseFormat(raw: string | undefined): Format {
    const v = (raw ?? 'generic').toLowerCase();
    if (v === 'splunk' || v === 'datadog' || v === 'loki') return v;
    return 'generic';
  }

  emit(record: AuditRecord): void {
    if (!this.enabled) return;
    if (this.queue.length >= this.queueMax) {
      this.queue.shift();
      this.droppedTotal++;
    }
    this.queue.push(record);
  }

  private start() {
    this.running = true;
    this.loopPromise = this.loop();
  }

  private async loop(): Promise<void> {
    let backoff = 1000;
    while (this.running) {
      if (this.queue.length === 0) {
        if (this.stopping) return;
        await sleep(200);
        continue;
      }
      const record = this.queue[0];
      try {
        await this.send(record);
        this.queue.shift();
        this.sentTotal++;
        this.lastSuccessAt = new Date();
        backoff = 1000;
      } catch (err) {
        this.failedTotal++;
        this.lastError = (err as Error).message;
        this.lastFailureAt = new Date();
        this.logger.warn(
          `HTTP sink send failed (${this.lastError}); retrying in ${backoff}ms`,
        );
        await sleep(backoff);
        backoff = Math.min(backoff * 2, 60000);
      }
    }
  }

  private async send(record: AuditRecord): Promise<void> {
    if (!this.url) throw new Error('URL not configured');
    const body = this.formatBody(record);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      if (this.format === 'splunk') {
        headers['Authorization'] = `Splunk ${this.token}`;
      } else if (this.format === 'datadog') {
        headers['DD-API-KEY'] = this.token;
      } else {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
    }

    const res = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `HTTP ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ''}`,
      );
    }
  }

  private formatBody(record: AuditRecord): unknown {
    const createdAt = new Date(record.createdAt);
    const iso = createdAt.toISOString();
    switch (this.format) {
      case 'splunk':
        return {
          event: record,
          sourcetype: 'lanventory:audit',
          time: Math.floor(createdAt.getTime() / 1000),
        };
      case 'datadog':
        return {
          ddsource: 'lanventory',
          service: 'audit',
          hostname: process.env.HOSTNAME ?? 'lanventory',
          message: JSON.stringify(record),
          timestamp: createdAt.getTime(),
          ...record,
        };
      case 'loki': {
        const ns = String(createdAt.getTime() * 1_000_000);
        return {
          streams: [
            {
              stream: {
                service: 'lanventory',
                kind: 'audit',
                entityType: record.entityType,
                action: record.action,
              },
              values: [[ns, JSON.stringify(record)]],
            },
          ],
        };
      }
      case 'generic':
      default:
        return {
          timestamp: iso,
          source: 'lanventory',
          kind: 'audit',
          record,
        };
    }
  }

  status(): SinkStatus {
    return {
      name: this.name,
      enabled: this.enabled,
      queued: this.queue.length,
      sentTotal: this.sentTotal,
      failedTotal: this.failedTotal,
      droppedTotal: this.droppedTotal,
      lastError: this.lastError,
      lastSuccessAt: this.lastSuccessAt?.toISOString() ?? null,
      lastFailureAt: this.lastFailureAt?.toISOString() ?? null,
    };
  }

  async shutdown(): Promise<void> {
    this.stopping = true;
    const deadline = Date.now() + 5000;
    while (this.queue.length > 0 && Date.now() < deadline) {
      try {
        await this.send(this.queue[0]);
        this.queue.shift();
        this.sentTotal++;
      } catch {
        break;
      }
    }
    this.running = false;
    if (this.loopPromise) {
      try {
        await this.loopPromise;
      } catch {
        // best-effort
      }
    }
  }
}
