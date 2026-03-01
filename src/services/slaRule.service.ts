import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlaDefinition } from 'src/entities/slaDefinition.entity';
import { SlaRule } from 'src/entities/slaRule.entity';
import { TicketPriority } from 'src/entities/tickets.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SlaRuleService {
  constructor(
    @InjectRepository(SlaRule)
    private readonly ruleRepo: Repository<SlaRule>,

    @InjectRepository(SlaDefinition)
    private readonly slaRepo: Repository<SlaDefinition>,
  ) {}

  async getAll() {
    return this.ruleRepo.find({
      relations: ['slaDefinition'],
      order: { priority: 'ASC' },
    });
  }

  async create(dto: { priority: TicketPriority; slaDefinitionId: string }) {
    const sla = await this.slaRepo.findOne({
      where: { id: dto.slaDefinitionId },
    });

    if (!sla) {
      throw new NotFoundException('SLA definition not found');
    }

    // opcjonalnie: usuń istniejącą regułę dla priority
    await this.ruleRepo.delete({ priority: dto.priority });

    const rule = this.ruleRepo.create({
      ...dto,
      slaDefinition: sla,
    });

    return this.ruleRepo.save(rule);
  }

  async update(
    id: string,
    dto: {
      priority?: TicketPriority;
      type: string;
      slaDefinitionId?: string;
    },
  ) {
    const rule: any = await this.ruleRepo.findOne({
      where: { id },
      relations: ['slaDefinition'],
    });

    if (!rule) {
      throw new NotFoundException('SLA rule not found');
    }

    if (dto.slaDefinitionId) {
      const sla = await this.slaRepo.findOne({
        where: { id: dto.slaDefinitionId },
      });

      if (!sla) {
        throw new NotFoundException('SLA definition not found');
      }

      rule.slaDefinition = sla;
    }

    if (dto.priority !== undefined) rule.priority = dto.priority;
    if (dto.type !== undefined) rule.type = dto.type;

    return this.ruleRepo.save(rule);
  }

  async delete(id: string) {
    const rule = await this.ruleRepo.findOne({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException('SLA rule not found');
    }

    await this.ruleRepo.remove(rule);
    return { deleted: true };
  }
}
