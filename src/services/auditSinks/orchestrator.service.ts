import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AuditRecord, AuditSink, SinkStatus } from './sink.interface';
import { FileAuditSink } from './file.sink';
import { HttpAuditSink } from './http.sink';

/**
 * Fans audit records out to any enabled external sinks (append-only file,
 * HTTP webhook). Fail-open: a failing sink never blocks the primary audit
 * write. Callers call `emit(record)` synchronously — sinks handle their own
 * queueing and retries.
 */
@Injectable()
export class AuditSinksService implements OnModuleDestroy {
  private readonly logger = new Logger(AuditSinksService.name);
  private readonly sinks: AuditSink[];

  constructor() {
    this.sinks = [new FileAuditSink(), new HttpAuditSink()];
    const active = this.sinks.filter((s) => s.enabled).map((s) => s.name);
    if (active.length === 0) {
      this.logger.log(
        'No external audit sinks configured (set AUDIT_SINK_FILE_PATH and/or AUDIT_SINK_URL)',
      );
    } else {
      this.logger.log(`Active audit sinks: ${active.join(', ')}`);
    }
  }

  emit(record: AuditRecord): void {
    for (const sink of this.sinks) {
      if (!sink.enabled) continue;
      try {
        sink.emit(record);
      } catch (err) {
        this.logger.warn(
          `Sink ${sink.name} emit threw: ${(err as Error).message}`,
        );
      }
    }
  }

  status(): SinkStatus[] {
    return this.sinks.map((s) => s.status());
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      this.sinks.map(async (s) => {
        try {
          await s.shutdown();
        } catch {
          // already logged inside sink
        }
      }),
    );
  }
}
