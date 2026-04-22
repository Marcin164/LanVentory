export type AuditRecord = {
  id: string;
  sequence: string;
  hash: string;
  prevHash: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, any> | null;
  createdAt: Date;
};

export type SinkStatus = {
  name: string;
  enabled: boolean;
  queued: number;
  sentTotal: number;
  failedTotal: number;
  droppedTotal: number;
  lastError: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};

export interface AuditSink {
  readonly name: string;
  readonly enabled: boolean;
  emit(record: AuditRecord): void;
  status(): SinkStatus;
  shutdown(): Promise<void>;
}
