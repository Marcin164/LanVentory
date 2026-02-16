import { Tickets } from 'src/entities/tickets.entity';
import { Repository } from 'typeorm';
import { BusinessTimeService } from './businessTime.service';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { SlaRule } from 'src/entities/slaRule.entity';
import { Injectable } from '@nestjs/common';
import { EscalationCreatorService } from './escalationCreator.service';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditService } from './audit.service';

@Injectable()
export class SlaCreatorService {
  constructor(
    @InjectRepository(SlaRule)
    private readonly slaRuleRepo: Repository<SlaRule>,

    @InjectRepository(SlaInstance)
    private readonly slaInstanceRepo: Repository<SlaInstance>,

    private readonly businessTime: BusinessTimeService,
    private readonly escalationCreator: EscalationCreatorService,
    private readonly audit: AuditService,
  ) {}

  async createInstances(ticket: Tickets, manager?: any) {
    const ruleRepo = manager
      ? manager.getRepository(SlaRule)
      : this.slaRuleRepo;

    const instanceRepo = manager
      ? manager.getRepository(SlaInstance)
      : this.slaInstanceRepo;

    const rules = await ruleRepo.find({
      where: { priority: ticket.priority },
      relations: ['slaDefinition', 'slaDefinition.calendar'],
    });

    for (const rule of rules) {
      const def = rule.slaDefinition;

      const dueAt = await this.businessTime.calculateDueDate(
        ticket.createdAt,
        def.targetMinutes,
        def.calendar,
      );

      const savedInstance = await instanceRepo.save({
        ticketId: ticket.id,
        slaDefinition: def,
        startAt: ticket.createdAt,
        dueAt,
      });

      await this.audit.log(
        'SLA_INSTANCE',
        savedInstance.id,
        'SLA_CREATED',
        {
          ticketId: ticket.id,
          targetMinutes: def.targetMinutes,
        },
        manager,
      );

      await this.escalationCreator.createForSlaInstance(savedInstance, manager);
    }
  }

  async deleteInstancesForTicket(ticketId: string, manager?: any) {
    const repo = manager
      ? manager.getRepository(SlaInstance)
      : this.slaInstanceRepo;

    await repo.delete({ ticketId });

    await this.audit.log(
      'SLA_INSTANCE',
      ticketId,
      'SLA_RECREATED_AFTER_PRIORITY_CHANGE',
      {},
      manager,
    );
  }
}
