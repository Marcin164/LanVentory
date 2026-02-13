import { Tickets } from 'src/entities/tickets.entity';
import { Repository } from 'typeorm';
import { BusinessTimeService } from './businessTime.service';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { SlaRule } from 'src/entities/slaRule.entity';
import { Injectable } from '@nestjs/common';
import { EscalationCreatorService } from './escalationCreator.service';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class SlaCreatorService {
  constructor(
    @InjectRepository(SlaRule)
    private slaRuleRepo: Repository<SlaRule>,

    @InjectRepository(SlaInstance)
    private slaInstanceRepo: Repository<SlaInstance>,

    private businessTime: BusinessTimeService,

    private readonly escalationCreator: EscalationCreatorService,
  ) {}

  async createInstances(ticket: Tickets) {
    const rules = await this.slaRuleRepo.find({
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

      const savedInstance = await this.slaInstanceRepo.save({
        ticketId: ticket.id,
        slaDefinition: def,
        startAt: ticket.createdAt,
        dueAt,
      });

      await this.escalationCreator.createForSlaInstance(savedInstance);
    }
  }

  async deleteInstancesForTicket(ticketId: string) {
    await this.slaInstanceRepo.delete({ ticketId });
  }
}
