import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  getReportMeta,
  listReports,
  ReportMeta,
} from 'src/helpers/reportRegistry';
import { withCache } from 'src/helpers/reportCache';
import { toCsv } from 'src/helpers/csv';
import { renderReportPdf } from 'src/helpers/pdf';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DataSource) {}

  list() {
    return listReports();
  }

  async generate(type: string, filters?: Record<string, any>) {
    const meta = this.requireMeta(type);
    const sanitized = this.sanitizeFilters(meta, filters);

    return withCache(meta.key, sanitized, () =>
      meta.fn({ db: this.db, filters: sanitized }),
    );
  }

  async generateBatch(types: string[]): Promise<Record<string, any>> {
    const unique = [...new Set(types)];
    const entries = await Promise.all(
      unique.map(async (type) => {
        try {
          const data = await this.generate(type);
          return [type, data] as const;
        } catch {
          return [type, []] as const;
        }
      }),
    );
    return Object.fromEntries(entries);
  }

  async exportCsv(type: string, filters?: Record<string, any>) {
    const data = await this.generate(type, filters);
    const csv = toCsv(Array.isArray(data) ? data : []);
    const meta = this.requireMeta(type);
    return { filename: `${meta.key}.csv`, csv };
  }

  async exportPdf(
    type: string,
    filters?: Record<string, any>,
    generatedBy?: string,
  ) {
    const data = await this.generate(type, filters);
    const meta = this.requireMeta(type);
    const rows = Array.isArray(data) ? data : [];
    const { buffer, sha256 } = await renderReportPdf(
      meta.title ?? meta.key,
      rows,
      { generatedBy, generatedAt: new Date(), filters },
    );
    return { filename: `${meta.key}.pdf`, buffer, sha256 };
  }

  private requireMeta(type: string): ReportMeta {
    const meta = getReportMeta(type);
    if (!meta) throw new NotFoundException(`Report ${type} not found`);
    return meta;
  }

  private sanitizeFilters(meta: ReportMeta, filters?: Record<string, any>) {
    if (!filters || !meta.supportsFilters?.length) return undefined;
    const out: Record<string, any> = {};
    for (const f of meta.supportsFilters) {
      if (filters[f] !== undefined) out[f] = filters[f];
    }
    return Object.keys(out).length ? out : undefined;
  }
}
