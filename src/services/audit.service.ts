import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SystemAuditLog } from 'src/entities/systemAuditLog.entity';
import { Repository, EntityManager } from 'typeorm';
import { createHash } from 'crypto';
import { AuditSinksService } from './auditSinks/orchestrator.service';

export const AUDIT_SEQUENCE_NAME = 'system_audit_log_chain_seq';
const AUDIT_ADVISORY_LOCK_ID = 0x7472696c;

export type AuditListQuery = {
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

const canonicalJson = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ':' +
          canonicalJson((value as Record<string, unknown>)[k]),
      )
      .join(',') +
    '}'
  );
};

const computeHash = (row: {
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, any> | null;
  createdAt: Date;
  prevHash: string | null;
  sequence: string | number;
}): string => {
  const payload = [
    String(row.sequence),
    row.entityType,
    row.entityId,
    row.action,
    canonicalJson(row.metadata ?? null),
    new Date(row.createdAt).toISOString(),
    row.prevHash ?? '',
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(SystemAuditLog)
    private readonly repo: Repository<SystemAuditLog>,
    private readonly sinks: AuditSinksService,
  ) {}

  /**
   * Append a tamper-evident entry to the audit log. Each record stores a SHA256
   * hash of its own fields plus the previous record's hash. Inserts are
   * serialized using a PG advisory lock to keep the chain consistent.
   */
  async log(
    entityType: string,
    entityId: string,
    action: string,
    metadata?: Record<string, any>,
    manager?: EntityManager,
  ) {
    const run = async (em: EntityManager) => {
      await em.query('SELECT pg_advisory_xact_lock($1)', [
        AUDIT_ADVISORY_LOCK_ID,
      ]);

      const [{ nextval }] = await em.query(
        `SELECT nextval($1)::text AS nextval`,
        [AUDIT_SEQUENCE_NAME],
      );
      const sequence: string = nextval;

      const last = await em
        .getRepository(SystemAuditLog)
        .createQueryBuilder('a')
        .where('a.hash IS NOT NULL')
        .orderBy('a.sequence', 'DESC')
        .limit(1)
        .getOne();

      const prevHash = last?.hash ?? null;
      const createdAt = new Date();
      const metaValue = metadata ?? null;

      const hash = computeHash({
        entityType,
        entityId,
        action,
        metadata: metaValue,
        createdAt,
        prevHash,
        sequence,
      });

      const [row] = await em.query(
        `INSERT INTO system_audit_log
          ("entityType", "entityId", action, metadata, "createdAt", sequence, hash, "prevHash")
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
         RETURNING *`,
        [
          entityType,
          entityId,
          action,
          metaValue === null ? null : JSON.stringify(metaValue),
          createdAt,
          sequence,
          hash,
          prevHash,
        ],
      );

      return row;
    };

    const row = manager
      ? await run(manager)
      : await this.repo.manager.transaction(run);

    // Sinks fire after commit in the non-nested case. Nested callers (passing
    // manager) may emit before the outer txn commits — rare today; revisit if
    // the outer rollback matters.
    if (row) {
      this.sinks.emit({
        id: row.id,
        sequence: String(row.sequence),
        hash: row.hash,
        prevHash: row.prevHash ?? null,
        entityType: row.entityType,
        entityId: row.entityId,
        action: row.action,
        metadata: row.metadata ?? null,
        createdAt: row.createdAt,
      });
    }

    return row;
  }

  async getForTicket(ticketId: string, action?: string) {
    const qb = this.repo.createQueryBuilder('a');

    qb.where(`(a.metadata->>'ticketId') = :ticketId`, { ticketId });

    if (action) {
      qb.andWhere('a.action = :action', { action });
    }

    qb.orderBy('a.sequence', 'ASC');

    return qb.getMany();
  }

  async getForEntity(entityType: string, entityId: string) {
    return this.repo.find({
      where: { entityType, entityId },
      order: { sequence: 'ASC' as any },
    });
  }

  async list(query: AuditListQuery) {
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);

    const qb = this.repo.createQueryBuilder('a').orderBy('a.sequence', 'DESC');

    if (query.entityType)
      qb.andWhere('a.entityType = :et', { et: query.entityType });
    if (query.entityId)
      qb.andWhere('a.entityId = :ei', { ei: query.entityId });
    if (query.action) qb.andWhere('a.action = :ac', { ac: query.action });
    if (query.from) qb.andWhere('a.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('a.createdAt <= :to', { to: query.to });

    if (query.cursor) {
      qb.andWhere('a.sequence < :cursor', { cursor: query.cursor });
    }

    qb.limit(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? items[items.length - 1].sequence
      : null;

    return { items, nextCursor };
  }

  async exportRange(query: {
    entityType?: string;
    entityId?: string;
    from?: string;
    to?: string;
  }) {
    const qb = this.repo.createQueryBuilder('a').orderBy('a.sequence', 'ASC');
    if (query.entityType)
      qb.andWhere('a.entityType = :et', { et: query.entityType });
    if (query.entityId)
      qb.andWhere('a.entityId = :ei', { ei: query.entityId });
    if (query.from) qb.andWhere('a.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('a.createdAt <= :to', { to: query.to });
    return qb.getMany();
  }

  /**
   * Walk the chain ordered by sequence, recompute each hash, and return the
   * first mismatch (if any).
   */
  async verifyChain(): Promise<{
    ok: boolean;
    total: number;
    firstMismatchSequence: string | null;
    mismatchReason: string | null;
  }> {
    const rows = await this.repo
      .createQueryBuilder('a')
      .orderBy('a.sequence', 'ASC')
      .getMany();

    let prevHash: string | null = null;
    let prevSequence: bigint | null = null;

    for (const row of rows) {
      if ((row.prevHash ?? null) !== prevHash) {
        return {
          ok: false,
          total: rows.length,
          firstMismatchSequence: row.sequence,
          mismatchReason: 'prevHash does not match previous record hash',
        };
      }

      const seqBig = BigInt(row.sequence ?? '0');
      if (prevSequence !== null && seqBig <= prevSequence) {
        return {
          ok: false,
          total: rows.length,
          firstMismatchSequence: row.sequence,
          mismatchReason: 'sequence is not strictly increasing',
        };
      }

      const expected = computeHash({
        entityType: row.entityType,
        entityId: row.entityId,
        action: row.action,
        metadata: row.metadata,
        createdAt: row.createdAt,
        prevHash: row.prevHash ?? null,
        sequence: row.sequence ?? '0',
      });

      if (expected !== row.hash) {
        return {
          ok: false,
          total: rows.length,
          firstMismatchSequence: row.sequence,
          mismatchReason: 'hash does not match recomputed value',
        };
      }

      prevHash = row.hash;
      prevSequence = seqBig;
    }

    return {
      ok: true,
      total: rows.length,
      firstMismatchSequence: null,
      mismatchReason: null,
    };
  }

  /**
   * Populate sequence/hash/prev_hash for any rows that were inserted before the
   * hash chain existed. Must run BEFORE the append-only trigger is installed.
   * Idempotent.
   */
  async backfillHashes(): Promise<number> {
    return this.repo.manager.transaction(async (em) => {
      const unchained = await em
        .getRepository(SystemAuditLog)
        .createQueryBuilder('a')
        .where('a.hash IS NULL OR a.sequence IS NULL')
        .orderBy('a.createdAt', 'ASC')
        .addOrderBy('a.id', 'ASC')
        .getMany();

      if (unchained.length === 0) return 0;

      const last = await em
        .getRepository(SystemAuditLog)
        .createQueryBuilder('a')
        .where('a.hash IS NOT NULL AND a.sequence IS NOT NULL')
        .orderBy('a.sequence', 'DESC')
        .limit(1)
        .getOne();

      let prevHash: string | null = last?.hash ?? null;
      let updated = 0;

      for (const row of unchained) {
        const [{ nextval }] = await em.query(
          `SELECT nextval($1)::text AS nextval`,
          [AUDIT_SEQUENCE_NAME],
        );
        const sequence: string = nextval;

        const hash = computeHash({
          entityType: row.entityType,
          entityId: row.entityId,
          action: row.action,
          metadata: row.metadata,
          createdAt: row.createdAt,
          prevHash,
          sequence,
        });

        await em.query(
          `UPDATE system_audit_log SET hash = $1, "prevHash" = $2, sequence = $3 WHERE id = $4`,
          [hash, prevHash, sequence, row.id],
        );

        prevHash = hash;
        updated += 1;
      }

      return updated;
    });
  }
}

export { computeHash, canonicalJson };
