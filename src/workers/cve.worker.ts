import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CveService } from 'src/services/cve.service';

@Injectable()
export class CveWorker {
  private readonly logger = new Logger(CveWorker.name);

  constructor(private readonly cveService: CveService) {}

  /**
   * Daily at 04:15 — off-peak, after retention (03:00) and backup (02:00).
   * OSV.dev is public with no auth; no rate-limit concerns for a few
   * hundred distinct (app, version) pairs.
   */
  @Cron('15 4 * * *')
  async handle() {
    try {
      const result = await this.cveService.reconcile();
      if (result.newMatches > 0 || result.matchesFound > 0) {
        this.logger.log(
          `CVE sweep — queried ${result.queried} pairs, ${result.matchesFound} matches (${result.newMatches} new)`,
        );
      }
    } catch (err) {
      this.logger.warn(`CVE sweep failed: ${(err as Error).message}`);
    }
  }
}
