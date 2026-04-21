import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  RetentionAction,
  RetentionPolicy,
} from 'src/entities/retentionPolicy.entity';
import { AuditService } from './audit.service';

const ENTITY_TABLE_MAP: Record<string, string> = {
  TicketActivity: 'ticket_activity',
  TicketComment: 'tickets_comments',
  Ticket: 'tickets',
  History: 'histories',
  Form: 'forms',
};

const FORBIDDEN_ENTITIES = new Set(['SystemAuditLog', 'system_audit_log']);

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @InjectRepository(RetentionPolicy)
    private readonly repo: Repository<RetentionPolicy>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  list() {
    return this.repo.find({ order: { entityType: 'ASC' } });
  }

  async create(input: {
    entityType: string;
    retentionDays: number;
    action?: RetentionAction;
    enabled?: boolean;
  }) {
    this.assertSupported(input.entityType);
    if (input.retentionDays < 1) {
      throw new BadRequestException('retentionDays must be >= 1');
    }
    const created = await this.repo.save(
      this.repo.create({
        entityType: input.entityType,
        retentionDays: input.retentionDays,
        action: input.action ?? 'purge',
        enabled: input.enabled ?? true,
      }),
    );
    await this.auditService.log('RetentionPolicy', created.id, 'created', {
      entityType: created.entityType,
      retentionDays: created.retentionDays,
      action: created.action,
    });
    return created;
  }

  async update(
    id: string,
    patch: Partial<
      Pick<
        RetentionPolicy,
        'retentionDays' | 'action' | 'enabled' | 'entityType'
      >
    >,
  ) {
    const policy = await this.repo.findOneBy({ id });
    if (!policy) throw new NotFoundException('Policy not found');
    if (patch.entityType) this.assertSupported(patch.entityType);
    if (patch.retentionDays !== undefined && patch.retentionDays < 1) {
      throw new BadRequestException('retentionDays must be >= 1');
    }
    Object.assign(policy, patch);
    const saved = await this.repo.save(policy);
    await this.auditService.log('RetentionPolicy', saved.id, 'updated', patch);
    return saved;
  }

  async delete(id: string) {
    const policy = await this.repo.findOneBy({ id });
    if (!policy) throw new NotFoundException('Policy not found');
    await this.repo.delete(id);
    await this.auditService.log('RetentionPolicy', id, 'deleted', {
      entityType: policy.entityType,
    });
    return { ok: true };
  }

  supportedEntityTypes() {
    return Object.keys(ENTITY_TABLE_MAP);
  }

  async runAll(): Promise<{ runs: { policyId: string; affected: number }[] }> {
    const policies = await this.repo.find({ where: { enabled: true } });
    const runs: { policyId: string; affected: number }[] = [];
    for (const p of policies) {
      try {
        const affected = await this.runPolicy(p);
        runs.push({ policyId: p.id, affected });
      } catch (err) {
        this.logger.error(
          `Retention policy ${p.id} (${p.entityType}) failed: ${(err as Error).message}`,
        );
      }
    }
    return { runs };
  }

  async runPolicy(policy: RetentionPolicy): Promise<number> {
    this.assertSupported(policy.entityType);
    const table = ENTITY_TABLE_MAP[policy.entityType];
    const cutoff = new Date(
      Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000,
    );

    let affected = 0;

    if (policy.action === 'purge') {
      const result = await this.dataSource.query(
        `DELETE FROM "${table}" WHERE "createdAt" < $1`,
        [cutoff],
      );
      affected = Array.isArray(result) ? (result[1] ?? 0) : (result ?? 0);
    } else {
      const rows = await this.dataSource.query(
        `SELECT * FROM "${table}" WHERE "createdAt" < $1`,
        [cutoff],
      );
      affected = rows.length;
      for (const row of rows) {
        await this.auditService.log(
          policy.entityType,
          String(row.id ?? row.uuid ?? 'unknown'),
          'archived',
          { snapshot: row, policyId: policy.id },
        );
      }
      await this.dataSource.query(
        `DELETE FROM "${table}" WHERE "createdAt" < $1`,
        [cutoff],
      );
    }

    policy.lastRunAt = new Date();
    policy.lastRunAffected = affected;
    await this.repo.save(policy);

    await this.auditService.log('RetentionPolicy', policy.id, 'executed', {
      entityType: policy.entityType,
      action: policy.action,
      retentionDays: policy.retentionDays,
      cutoff: cutoff.toISOString(),
      affected,
    });

    return affected;
  }

  private assertSupported(entityType: string) {
    if (FORBIDDEN_ENTITIES.has(entityType)) {
      throw new BadRequestException(
        `${entityType} is append-only and cannot have a retention policy`,
      );
    }
    if (!ENTITY_TABLE_MAP[entityType]) {
      throw new BadRequestException(
        `Unsupported entityType. Allowed: ${Object.keys(ENTITY_TABLE_MAP).join(', ')}`,
      );
    }
  }
}
