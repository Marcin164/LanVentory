import { Injectable } from '@nestjs/common';
import { EscalationEngineService } from 'src/services/escalationEngine.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class EscalationWorker {
  constructor(private readonly engine: EscalationEngineService) {}

  @Cron('* * * * *') // co minutę
  async handle() {
    await this.engine.processDueEscalations();
  }
}
