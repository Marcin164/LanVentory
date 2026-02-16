import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlaEscalationInstance } from 'src/entities/slaEscalationInstance.entity';
import { Repository } from 'typeorm';
import { EscalationActionService } from './escalationAction.service';
import { AuditService } from './audit.service';
@Injectable()
export class EscalationEngineService {
  constructor(
    @InjectRepository(SlaEscalationInstance)
    private readonly repo: Repository<SlaEscalationInstance>,

    private readonly actionService: EscalationActionService,
    private readonly audit: AuditService,
  ) {}

  async processDueEscalations() {
    const queryRunner = this.repo.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const escalations = await queryRunner.manager
        .createQueryBuilder(SlaEscalationInstance, 'e')
        .innerJoinAndSelect('e.definition', 'definition')
        .innerJoinAndSelect('e.slaInstance', 'slaInstance')
        .where('e.triggered = false')
        .andWhere('e.triggerAt <= now()')
        .andWhere('slaInstance.paused = false')
        .setLock('pessimistic_write')
        .limit(20)
        .getMany();

      for (const esc of escalations) {
        // wykonanie akcji
        await this.actionService.execute(esc);

        // AUDYT
        await this.audit.log(
          'ESCALATION_INSTANCE',
          esc.id,
          'ESCALATION_TRIGGERED',
          {
            ticketId: esc.slaInstance.ticketId,
            actionType: esc.definition.actionType,
          },
          queryRunner.manager,
        );

        esc.triggered = true;
        esc.triggeredAt = new Date();

        await queryRunner.manager.save(esc);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
