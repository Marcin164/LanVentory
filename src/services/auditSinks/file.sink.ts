import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AuditRecord, AuditSink, SinkStatus } from './sink.interface';

export class FileAuditSink implements AuditSink {
  readonly name = 'file';
  readonly enabled: boolean;
  private readonly logger = new Logger(FileAuditSink.name);
  private readonly filePath: string | null;
  private writeChain: Promise<void> = Promise.resolve();
  private sentTotal = 0;
  private failedTotal = 0;
  private lastError: string | null = null;
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;

  constructor() {
    const envPath = process.env.AUDIT_SINK_FILE_PATH;
    this.enabled = Boolean(envPath);
    this.filePath = envPath ? path.resolve(envPath) : null;
    if (this.filePath) {
      try {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      } catch (err) {
        this.logger.warn(
          `Failed to ensure sink directory: ${(err as Error).message}`,
        );
      }
      this.logger.log(`File sink active at ${this.filePath}`);
    }
  }

  emit(record: AuditRecord): void {
    if (!this.enabled || !this.filePath) return;
    const line =
      JSON.stringify({
        ...record,
        createdAt: new Date(record.createdAt).toISOString(),
      }) + '\n';

    this.writeChain = this.writeChain.then(() => this.writeLine(line));
  }

  private async writeLine(line: string) {
    if (!this.filePath) return;
    try {
      await fs.promises.appendFile(this.filePath, line, 'utf8');
      this.sentTotal++;
      this.lastSuccessAt = new Date();
    } catch (err) {
      this.failedTotal++;
      this.lastError = (err as Error).message;
      this.lastFailureAt = new Date();
      this.logger.warn(`File sink append failed: ${this.lastError}`);
    }
  }

  status(): SinkStatus {
    return {
      name: this.name,
      enabled: this.enabled,
      queued: 0,
      sentTotal: this.sentTotal,
      failedTotal: this.failedTotal,
      droppedTotal: 0,
      lastError: this.lastError,
      lastSuccessAt: this.lastSuccessAt?.toISOString() ?? null,
      lastFailureAt: this.lastFailureAt?.toISOString() ?? null,
    };
  }

  async shutdown(): Promise<void> {
    try {
      await this.writeChain;
    } catch {
      // errors already logged per-line
    }
  }
}
