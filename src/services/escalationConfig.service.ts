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

  async getForSla(slaDefinitionId: string) {
    return this.escalationRepo.find({
      where: {
        slaDefinition: { id: slaDefinitionId },
      },
      order: { triggerPercentage: 'ASC' },
    });
  }

  async create(slaDefinitionId: string, dto: any) {
    const slaDefinition = await this.slaDefRepo.findOneBy({
      id: slaDefinitionId,
    });

    if (!slaDefinition) throw new NotFoundException('SLA definition not found');

    const escalation = this.escalationRepo.create({
      ...dto,
      slaDefinition,
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
