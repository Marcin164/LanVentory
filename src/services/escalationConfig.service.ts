import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlaDefinition } from 'src/entities/slaDefinition.entity';
import { SlaEscalationDefinition } from 'src/entities/slaEscalationDefinition.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EscalationConfigService {
  constructor(
    @InjectRepository(SlaEscalationDefinition)
    private escalationRepo: Repository<SlaEscalationDefinition>,

    @InjectRepository(SlaDefinition)
    private slaDefRepo: Repository<SlaDefinition>,
  ) {}

  async getAll() {
    return this.escalationRepo.find({
      order: { triggerPercentage: 'ASC' },
    });
  }

  async getEscalationsGroupedBySla() {
    const slas = await this.escalationRepo
      .createQueryBuilder('esc')
      .leftJoinAndSelect('esc.slaDefinition', 'sla')
      .select([
        'esc.id',
        'esc.triggerPercentage',
        'esc.actionType',
        'esc.actionConfig',
        'esc.createdAt',
        'sla.id',
        'sla.name',
      ])
      .getMany();

    const grouped = new Map<string, any>();

    for (const esc of slas) {
      const slaId = esc.slaDefinition.id;
      const slaName = esc.slaDefinition.name;

      if (!grouped.has(slaId)) {
        grouped.set(slaId, {
          slaDefinitionId: slaId,
          slaDefinitionName: slaName,
          escalations: [],
        });
      }

      const group = grouped.get(slaId)!;

      group.escalations.push({
        id: esc.id,
        triggerPercentage: esc.triggerPercentage,
        actionType: esc.actionType,
        actionConfig: esc.actionConfig,
        createdAt: esc.createdAt,
      });
    }

    return Array.from(grouped.values());
  }

  async create(dto: any) {
    const slaDefinition = await this.slaDefRepo.findOneBy({
      id: dto.definition,
    });

    if (!slaDefinition) throw new NotFoundException('SLA definition not found');

    const escalation = this.escalationRepo.create({
      ...dto,
    });

    return this.escalationRepo.save(escalation);
  }

  async update(id: string, dto: any) {
    const escalation = await this.escalationRepo.findOneBy({ id });

    if (!escalation) throw new NotFoundException('Escalation not found');

    Object.assign(escalation, dto);

    return this.escalationRepo.save(escalation);
  }

  async delete(id: string) {
    const escalation = await this.escalationRepo.findOneBy({ id });

    if (!escalation) throw new NotFoundException('Escalation not found');

    await this.escalationRepo.remove(escalation);

    return { deleted: true };
  }
}
