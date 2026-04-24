import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentTaskService } from 'src/services/agentTask.service';

@Injectable()
export class AgentTaskWorker {
  private readonly logger = new Logger(AgentTaskWorker.name);

  constructor(private readonly service: AgentTaskService) {}

  /** Release leases from agents that went silent mid-task. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepLeases() {
    try {
      const released = await this.service.releaseExpiredLeases();
      if (released > 0) {
        this.logger.log(`Released ${released} expired agent task lease(s)`);
      }
    } catch (err) {
      this.logger.warn(`Lease sweep failed: ${(err as Error).message}`);
    }
  }
}
