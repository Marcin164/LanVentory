import { Injectable } from '@nestjs/common';
import { EscalationEngineService } from 'src/services/escalationEngine.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class EscalationWorker {
  constructor(private readonly engine: EscalationEngineService) {}

  @Cron('* * * * *')
  async handle() {
    await this.engine.processDueEscalations();
  }
}
