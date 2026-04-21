import { Injectable } from '@nestjs/common';
import { PassThrough, Readable } from 'stream';
import * as archiver from 'archiver';
import { createHash, randomUUID } from 'crypto';
import { ReportsService } from './reports.service';
import { AuditService } from './audit.service';
import { listReports } from 'src/helpers/reportRegistry';

export type EvidenceInclude = 'audit' | 'reports' | 'tickets';

interface EvidenceInput {
  from: string;
  to: string;
  include: EvidenceInclude[];
  reportTypes?: string[];
  actor?: string;
}

interface ManifestEntry {
  path: string;
  bytes: number;
  sha256: string;
}

@Injectable()
export class EvidencePackService {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService,
  ) {}

  async build(input: EvidenceInput): Promise<{
    stream: Readable;
    filename: string;
    packId: string;
  }> {
    const packId = randomUUID();
    const filename = `evidence-${packId}.zip`;

    const archive = archiver.create('zip', { zlib: { level: 9 } });
    const output = new PassThrough();

    const manifest: ManifestEntry[] = [];

    const append = (path: string, content: Buffer | string) => {
      const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
      manifest.push({
        path,
        bytes: buf.byteLength,
        sha256: createHash('sha256').update(buf).digest('hex'),
      });
      archive.append(buf, { name: path });
    };

    archive.pipe(output);

    if (input.include.includes('audit')) {
      const items = await this.auditService.exportRange({
        from: input.from,
        to: input.to,
      });
      const verify = await this.auditService.verifyChain();
      const jsonl = items.map((row) => JSON.stringify(row)).join('\n');
      append('audit/audit_log.jsonl', jsonl);
      append('audit/verify.json', JSON.stringify(verify, null, 2));
    }

    if (input.include.includes('reports')) {
      const reports = listReports();
      const selected = input.reportTypes?.length
        ? reports.filter((r) => input.reportTypes!.includes(r.key))
        : reports;
      for (const r of selected) {
        try {
          const csv = await this.reportsService.exportCsv(r.key, {
            from: input.from,
            to: input.to,
          });
          append(`reports/${csv.filename}`, csv.csv);
          const pdf = await this.reportsService.exportPdf(
            r.key,
            { from: input.from, to: input.to },
            input.actor,
          );
          append(`reports/${pdf.filename}`, pdf.buffer);
        } catch {
          /* skip failing report */
        }
      }
    }

    if (input.include.includes('tickets')) {
      const items = await this.auditService.exportRange({
        entityType: 'Ticket',
        from: input.from,
        to: input.to,
      });
      append('tickets/ticket_audit.jsonl', items.map((r) => JSON.stringify(r)).join('\n'));
    }

    const manifestJson = JSON.stringify(
      {
        packId,
        from: input.from,
        to: input.to,
        include: input.include,
        generatedAt: new Date().toISOString(),
        actor: input.actor,
        files: manifest,
      },
      null,
      2,
    );
    const manifestBuf = Buffer.from(manifestJson);
    const manifestSig = createHash('sha256').update(manifestBuf).digest('hex');

    archive.append(manifestBuf, { name: 'manifest.json' });
    archive.append(Buffer.from(manifestSig), { name: 'manifest.sig' });

    archive.finalize();

    await this.auditService.log('EvidencePack', packId, 'generated', {
      actor: input.actor,
      from: input.from,
      to: input.to,
      include: input.include,
      reportTypes: input.reportTypes,
      manifestSha256: manifestSig,
      fileCount: manifest.length,
    });

    return { stream: output, filename, packId };
  }
}
