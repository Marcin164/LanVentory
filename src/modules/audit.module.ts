import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditController } from 'src/controllers/audit.controller';
import { SystemAuditLog } from 'src/entities/systemAuditLog.entity';
import {
  AUDIT_SEQUENCE_NAME,
  AuditService,
} from 'src/services/audit.service';
import { AuditSinksService } from 'src/services/auditSinks/orchestrator.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemAuditLog])],
  controllers: [AuditController],
  providers: [AuditService, AuditSinksService],
  exports: [AuditService, AuditSinksService],
})
export class AuditModule implements OnModuleInit {
  private readonly logger = new Logger(AuditModule.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.ensureSequence();
    await this.dropAppendOnlyTriggerIfExists();
    const backfilled = await this.auditService.backfillHashes();
    if (backfilled > 0) {
      this.logger.log(`Backfilled hash chain for ${backfilled} audit rows`);
    }
    await this.alignSequenceWithMax();
    await this.installAppendOnlyTrigger();
  }

  private async ensureSequence() {
    await this.dataSource.query(
      `CREATE SEQUENCE IF NOT EXISTS ${AUDIT_SEQUENCE_NAME} AS bigint START WITH 1 INCREMENT BY 1`,
    );
  }

  private async alignSequenceWithMax() {
    const [row] = await this.dataSource.query(
      `SELECT COALESCE(MAX(sequence), 0)::bigint AS max FROM system_audit_log`,
    );
    const maxSeq = Number(row?.max ?? 0);
    if (maxSeq > 0) {
      await this.dataSource.query(
        `SELECT setval($1, $2, true)`,
        [AUDIT_SEQUENCE_NAME, maxSeq],
      );
    }
  }

  private async dropAppendOnlyTriggerIfExists() {
    await this.dataSource.query(
      `DROP TRIGGER IF EXISTS system_audit_log_no_mutation ON system_audit_log`,
    );
  }

  private async installAppendOnlyTrigger() {
    await this.dataSource.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_modification()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'system_audit_log is append-only';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await this.dataSource.query(`
      CREATE TRIGGER system_audit_log_no_mutation
      BEFORE UPDATE OR DELETE ON system_audit_log
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
    `);

    this.logger.log('Append-only trigger active on system_audit_log');
  }
}
