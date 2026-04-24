import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PassThrough, Readable } from 'stream';
import * as archiver from 'archiver';
import { createHash, randomUUID } from 'crypto';

import { Users } from 'src/entities/users.entity';
import { AuditService } from 'src/services/audit.service';
import { LegalHoldService } from 'src/services/legalHold.service';

const PII_FIELDS = [
  'name',
  'surname',
  'username',
  'email',
  'phone',
  'title',
  'distinguishedName',
  'streetAddress',
  'city',
  'postalCode',
  'country',
  'manager',
  'office',
  'department',
  'company',
  'authUserId',
  'memberOf',
  'userAccountControl',
  'pwdLastSet',
] as const;

type RelatedDataset = {
  key: string;
  query: string;
  params: any[];
};

/**
 * Tables that can contain references to a user, joined for DSAR export.
 * Queries use raw SQL so we don't need every entity imported here.
 */
const RELATED_DATASETS = (userId: string): RelatedDataset[] => [
  {
    key: 'devices',
    query: 'SELECT * FROM devices WHERE "userId" = $1',
    params: [userId],
  },
  {
    key: 'tickets_as_requester',
    query: 'SELECT * FROM tickets WHERE "requesterId" = $1',
    params: [userId],
  },
  {
    key: 'tickets_as_assignee',
    query: 'SELECT * FROM tickets WHERE assignee = $1',
    params: [userId],
  },
  {
    key: 'ticket_activity',
    query: 'SELECT * FROM ticket_activity WHERE "userId" = $1',
    params: [userId],
  },
  {
    key: 'ticket_approvals',
    query: 'SELECT * FROM tickets_approvals WHERE "requesterId" = $1 OR "approverId" = $1',
    params: [userId],
  },
  {
    key: 'histories',
    query: 'SELECT * FROM histories WHERE "userId" = $1',
    params: [userId],
  },
  {
    key: 'history_approvers',
    query: 'SELECT * FROM history_approvers WHERE "userId" = $1',
    params: [userId],
  },
  {
    key: 'user_settings',
    query: 'SELECT * FROM user_settings WHERE "userId" = $1',
    params: [userId],
  },
  {
    key: 'dashboards',
    query: 'SELECT * FROM dashboards WHERE "userId" = $1',
    params: [userId],
  },
  {
    key: 'flows',
    query: 'SELECT * FROM flows WHERE "userId" = $1',
    params: [userId],
  },
  {
    key: 'forms',
    query: 'SELECT * FROM forms WHERE "userId" = $1',
    params: [userId],
  },
  {
    key: 'assignment_group_members',
    query: 'SELECT * FROM assignment_group_members WHERE "userId" = $1',
    params: [userId],
  },
];

export type DsarExportResult = {
  stream: Readable;
  filename: string;
  requestId: string;
};

export type DsarErasureResult = {
  requestId: string;
  status: 'completed' | 'rejected';
  fieldsNulled: string[];
  itemsRetained: {
    category: string;
    reason: string;
    count?: number;
  }[];
  activeLegalHolds?: {
    id: string;
    reason: string;
    retainUntil: Date | null;
  }[];
};

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly legalHolds: LegalHoldService,
  ) {}

  async getPersonalData(userId: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      name: user.name,
      surname: user.surname,
      username: user.username,
      email: user.email,
      phone: user.phone,
      title: user.title,
      department: user.department,
      company: user.company,
      office: user.office,
      streetAddress: user.streetAddress,
      city: user.city,
      postalCode: user.postalCode,
      country: user.country,
      manager: user.manager,
      distinguishedName: user.distinguishedName,
      whenCreated: user.whenCreated,
      erasedAt: user.erasedAt,
      erasureReason: user.erasureReason,
    };
  }

  /**
   * GDPR Art. 15 — right of access.
   *
   * Collects everything we hold about the subject, packages it as a ZIP
   * stream with a manifest and SHA256 sidecars, logs the issuance.
   */
  async exportAllData(
    userId: string,
    actor: string,
  ): Promise<DsarExportResult> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const requestId = randomUUID();
    const filename = `dsar-${userId}-${requestId}.zip`;

    const archive = archiver.create('zip', { zlib: { level: 9 } });
    const output = new PassThrough();

    type ManifestEntry = { path: string; bytes: number; sha256: string };
    const manifest: ManifestEntry[] = [];

    const append = (path: string, content: string | Buffer) => {
      const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
      manifest.push({
        path,
        bytes: buf.byteLength,
        sha256: createHash('sha256').update(buf).digest('hex'),
      });
      archive.append(buf, { name: path });
    };

    archive.pipe(output);

    append('user.json', JSON.stringify(user, null, 2));

    const summary: Record<string, number> = {};
    for (const ds of RELATED_DATASETS(userId)) {
      try {
        const rows = await this.dataSource.query(ds.query, ds.params);
        append(`${ds.key}.json`, JSON.stringify(rows, null, 2));
        summary[ds.key] = rows.length;
      } catch {
        // table missing in this environment (migrations not run, renamed, etc.)
        append(`${ds.key}.json`, '[]');
        summary[ds.key] = 0;
      }
    }

    const auditRows = await this.audit.exportRange({
      entityType: 'User',
      entityId: userId,
    });
    append('audit_user.jsonl', auditRows.map((r) => JSON.stringify(r)).join('\n'));
    summary['audit_user'] = auditRows.length;

    const privacyRows = await this.audit.exportRange({
      entityType: 'PrivacyRecord',
      entityId: userId,
    });
    append(
      'audit_privacy.jsonl',
      privacyRows.map((r) => JSON.stringify(r)).join('\n'),
    );
    summary['audit_privacy'] = privacyRows.length;

    const holds = await this.legalHolds.list(userId);
    append('legal_holds.json', JSON.stringify(holds, null, 2));
    summary['legal_holds'] = holds.length;

    const manifestJson = JSON.stringify(
      {
        requestId,
        subjectUserId: userId,
        generatedAt: new Date().toISOString(),
        generatedBy: actor,
        article: 'GDPR Art. 15',
        summary,
        files: manifest,
      },
      null,
      2,
    );
    const manifestBuf = Buffer.from(manifestJson);
    const manifestSig = createHash('sha256').update(manifestBuf).digest('hex');

    archive.append(manifestBuf, { name: 'manifest.json' });
    archive.append(Buffer.from(manifestSig), { name: 'manifest.sig' });

    await archive.finalize();

    await this.audit.log('PrivacyRecord', userId, 'export_generated', {
      requestId,
      actor,
      article: 'GDPR Art. 15',
      summary,
      manifestSha256: manifestSig,
    });

    return { stream: output, filename, requestId };
  }

  /**
   * GDPR Art. 17 — right to erasure.
   *
   * Checks active legal holds; if none, anonymises the user row (PII →
   * NULL) and keeps the opaque id so tamper-evident audit references stay
   * valid. Returns a structured receipt describing what was nullified and
   * what was retained (and why).
   */
  async eraseUser(
    userId: string,
    input: { actor: string; reason: string },
  ): Promise<DsarErasureResult> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const requestId = randomUUID();

    if (user.erasedAt) {
      await this.audit.log('PrivacyRecord', userId, 'erase_noop', {
        requestId,
        actor: input.actor,
        reason: 'already erased',
        previousErasedAt: user.erasedAt,
      });
      return {
        requestId,
        status: 'completed',
        fieldsNulled: [],
        itemsRetained: [
          {
            category: 'user_profile',
            reason: 'already erased on ' + user.erasedAt.toISOString(),
          },
        ],
      };
    }

    const activeHolds = await this.legalHolds.activeHolds(userId);
    if (activeHolds.length > 0) {
      await this.audit.log('PrivacyRecord', userId, 'erase_rejected', {
        requestId,
        actor: input.actor,
        reason: input.reason,
        article: 'GDPR Art. 17',
        blockedBy: activeHolds.map((h) => ({
          id: h.id,
          reason: h.reason,
          retainUntil: h.retainUntil,
        })),
      });
      throw new ConflictException({
        message:
          'Erasure is blocked by active legal hold(s). Release the hold(s) first or refuse the DSAR with legal basis.',
        activeHolds: activeHolds.map((h) => ({
          id: h.id,
          reason: h.reason,
          legalBasis: h.legalBasis,
          retainUntil: h.retainUntil,
        })),
      });
    }

    const patch: Partial<Users> = {};
    const fieldsNulled: string[] = [];
    for (const f of PII_FIELDS) {
      if ((user as any)[f] !== null && (user as any)[f] !== undefined) {
        (patch as any)[f] = null;
        fieldsNulled.push(f);
      }
    }
    patch.erasedAt = new Date();
    patch.erasureReason = input.reason;

    await this.usersRepository.update({ id: userId }, patch);

    const itemsRetained = [
      {
        category: 'system_audit_log',
        reason:
          'append-only tamper-evident chain; retained under GDPR Art. 17(3)(b) / (e)',
      },
      {
        category: 'user_id',
        reason:
          'opaque UUID kept so historical foreign keys stay valid; no PII remains',
      },
    ];

    await this.audit.log('PrivacyRecord', userId, 'erased', {
      requestId,
      actor: input.actor,
      reason: input.reason,
      article: 'GDPR Art. 17',
      fieldsNulled,
      itemsRetained,
    });

    return {
      requestId,
      status: 'completed',
      fieldsNulled,
      itemsRetained,
    };
  }
}
