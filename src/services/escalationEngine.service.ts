import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SlaEscalationInstance } from 'src/entities/slaEscalationInstance.entity';
import { EscalationActionService } from './escalationAction.service';

@Injectable()
export class EscalationEngineService {
  constructor(
    @InjectRepository(SlaEscalationInstance)
    private escalationRepo: Repository<SlaEscalationInstance>,

    private readonly actionService: EscalationActionService,
  ) {}

  async processDueEscalations() {
    const escalations = await this.escalationRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.definition', 'definition')
      .leftJoinAndSelect('e.slaInstance', 'slaInstance')
      .leftJoinAndSelect('slaInstance.slaDefinition', 'slaDefinition')
      .leftJoinAndSelect('slaDefinition.calendar', 'calendar')
      .where('e.triggered = false')
      .andWhere('e.triggerAt <= now()')
      .andWhere('slaInstance.paused = false')
      .getMany();

    for (const esc of escalations) {
      await this.actionService.execute(esc);

      esc.triggered = true;
      esc.triggeredAt = new Date();

      await this.escalationRepo.save(esc);
    }
  }
}
