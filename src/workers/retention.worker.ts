import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RetentionService } from 'src/services/retention.service';

@Injectable()
export class RetentionWorker {
  private readonly logger = new Logger(RetentionWorker.name);

  constructor(private readonly retentionService: RetentionService) {}

  @Cron('0 3 * * *')
  async handle() {
    const { runs } = await this.retentionService.runAll();
    if (runs.length) {
      this.logger.log(
        `Retention sweep done — ${runs.length} polic${runs.length === 1 ? 'y' : 'ies'} executed`,
      );
    }
  }
}
