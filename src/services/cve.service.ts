import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Applications } from 'src/entities/applications.entity';
import { DevicesApplications } from 'src/entities/devicesApplications.entity';
import { CveMatch, CveSeverity } from 'src/entities/cveMatch.entity';
import { AuditService } from 'src/services/audit.service';
import { uuidv4 } from 'src/helpers/uuidv4';

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const OSV_DETAIL_URL = 'https://api.osv.dev/v1/vulns';

type OsvBatchResponse = {
  results: Array<{ vulns?: Array<{ id: string }> }>;
};

type OsvVuln = {
  id: string;
  summary?: string;
  details?: string;
  published?: string;
  severity?: Array<{ type: string; score: string }>;
  database_specific?: { severity?: string };
};

/**
 * Maps an OSV vuln's severity (CVSS vector or database-specific label) to
 * our coarse bucket. OSV severity is optional — many entries rely on
 * downstream feeds to annotate.
 */
function classifySeverity(v: OsvVuln): CveSeverity {
  const dbSev = v.database_specific?.severity?.toUpperCase();
  if (dbSev === 'CRITICAL' || dbSev === 'HIGH' || dbSev === 'MEDIUM' || dbSev === 'LOW')
    return dbSev as CveSeverity;

  const vector = v.severity?.find((s) => s.type.startsWith('CVSS'))?.score;
  if (!vector) return 'UNKNOWN';
  const match = vector.match(/\/?CVSS[^\/]*\/([^\/]+)/i);
  // cheap heuristic — parse the base score from the vector if present.
  const scoreMatch = vector.match(/(\d+(\.\d+)?)/);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : NaN;
  if (!Number.isFinite(score)) return 'UNKNOWN';
  if (score >= 9) return 'CRITICAL';
  if (score >= 7) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'UNKNOWN';
}

@Injectable()
export class CveService {
  private readonly logger = new Logger(CveService.name);

  constructor(
    @InjectRepository(Applications)
    private readonly applicationsRepo: Repository<Applications>,
    @InjectRepository(DevicesApplications)
    private readonly installsRepo: Repository<DevicesApplications>,
    @InjectRepository(CveMatch)
    private readonly cveRepo: Repository<CveMatch>,
    private readonly audit: AuditService,
  ) {}

  /**
   * Walk distinct (app, version) pairs currently installed somewhere in
   * the fleet, ask OSV for vulns, and upsert matches. Idempotent.
   *
   * Returns a small summary for the scheduler / audit log.
   */
  async reconcile(): Promise<{
    queried: number;
    matchesFound: number;
    newMatches: number;
  }> {
    const pairs = await this.installsRepo
      .createQueryBuilder('da')
      .innerJoin('da.application', 'app')
      .where('da.uninstalledAt IS NULL')
      .andWhere('da.version IS NOT NULL')
      .select([
        'app.id AS "applicationId"',
        'app.name AS name',
        'da.version AS version',
      ])
      .groupBy('app.id')
      .addGroupBy('app.name')
      .addGroupBy('da.version')
      .getRawMany<{ applicationId: string; name: string; version: string }>();

    if (pairs.length === 0) {
      return { queried: 0, matchesFound: 0, newMatches: 0 };
    }

    const batchBody = {
      queries: pairs.map((p) => ({
        version: p.version,
        package: { name: p.name },
      })),
    };

    let batchResp: OsvBatchResponse;
    try {
      const res = await fetch(OSV_BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchBody),
      });
      if (!res.ok) throw new Error(`OSV ${res.status}`);
      batchResp = (await res.json()) as OsvBatchResponse;
    } catch (err) {
      this.logger.warn(`OSV batch query failed: ${(err as Error).message}`);
      throw err;
    }

    const now = new Date();
    let matchesFound = 0;
    let newMatches = 0;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const result = batchResp.results?.[i];
      const vulnIds = (result?.vulns ?? []).map((v) => v.id);
      matchesFound += vulnIds.length;

      if (vulnIds.length === 0) continue;

      for (const cveId of vulnIds) {
        const existing = await this.cveRepo.findOne({
          where: {
            applicationId: pair.applicationId,
            version: pair.version,
            cveId,
          },
        });
        if (existing) {
          existing.lastCheckedAt = now;
          await this.cveRepo.save(existing);
          continue;
        }

        const detail = await this.fetchVulnDetail(cveId);
        const row = new CveMatch();
        row.id = uuidv4();
        row.applicationId = pair.applicationId;
        row.version = pair.version;
        row.cveId = cveId;
        row.severity = detail ? classifySeverity(detail) : 'UNKNOWN';
        row.summary = detail?.summary ?? detail?.details?.slice(0, 500) ?? null;
        row.publishedAt = detail?.published ? new Date(detail.published) : null;
        row.firstSeenAt = now;
        row.lastCheckedAt = now;
        row.source = 'osv';
        await this.cveRepo.save(row);
        newMatches += 1;
      }
    }

    await this.audit.log('CveScan', 'batch', 'completed', {
      queried: pairs.length,
      matchesFound,
      newMatches,
    });

    return { queried: pairs.length, matchesFound, newMatches };
  }

  private async fetchVulnDetail(id: string): Promise<OsvVuln | null> {
    try {
      const res = await fetch(`${OSV_DETAIL_URL}/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      return (await res.json()) as OsvVuln;
    } catch {
      return null;
    }
  }

  async forDevice(deviceId: string) {
    return this.cveRepo
      .createQueryBuilder('c')
      .innerJoin(
        DevicesApplications,
        'da',
        'da.applicationId = c.applicationId AND (c.version IS NULL OR da.version = c.version)',
      )
      .innerJoin('c.application', 'app')
      .where('da.deviceId = :deviceId', { deviceId })
      .andWhere('da.uninstalledAt IS NULL')
      .select([
        'c.id AS id',
        'c.cveId AS "cveId"',
        'c.severity AS severity',
        'c.summary AS summary',
        'c.publishedAt AS "publishedAt"',
        'c.version AS version',
        'app.id AS "applicationId"',
        'app.name AS "applicationName"',
        'app.publisher AS publisher',
      ])
      .orderBy(
        `CASE c.severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END`,
      )
      .addOrderBy('app.name', 'ASC')
      .getRawMany();
  }

  async summary() {
    const rows = await this.cveRepo
      .createQueryBuilder('c')
      .innerJoin(
        DevicesApplications,
        'da',
        'da.applicationId = c.applicationId AND (c.version IS NULL OR da.version = c.version)',
      )
      .where('da.uninstalledAt IS NULL')
      .select('c.severity', 'severity')
      .addSelect(
        `COUNT(DISTINCT c."cveId" || ':' || da."deviceId")`,
        'count',
      )
      .groupBy('c.severity')
      .getRawMany();

    const byLevel: Record<CveSeverity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      UNKNOWN: 0,
    };
    for (const r of rows) {
      byLevel[r.severity as CveSeverity] = Number(r.count) || 0;
    }
    return byLevel;
  }
}
