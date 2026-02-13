import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SlaEscalationDefinition } from 'src/entities/slaEscalationDefinition.entity';
import { SlaEscalationInstance } from 'src/entities/slaEscalationInstance.entity';
import { BusinessTimeService } from './businessTime.service';
import { SlaInstance } from 'src/entities/slaInstance.entity';

@Injectable()
export class EscalationCreatorService {
  constructor(
    @InjectRepository(SlaEscalationDefinition)
    private escalationDefRepo: Repository<SlaEscalationDefinition>,

    @InjectRepository(SlaEscalationInstance)
    private escalationInstRepo: Repository<SlaEscalationInstance>,

    private readonly businessTime: BusinessTimeService,
  ) {}

  async createForSlaInstance(slaInstance: SlaInstance) {
    const definitions = await this.escalationDefRepo.find({
      where: {
        slaDefinition: { id: slaInstance.slaDefinition.id },
      },
    });

    if (!definitions.length) return;

    for (const def of definitions) {
      const triggerMinutes =
        (slaInstance.slaDefinition.targetMinutes * def.triggerPercentage) / 100;

      const triggerAt = await this.businessTime.calculateDueDate(
        slaInstance.startAt,
        triggerMinutes,
        slaInstance.slaDefinition.calendar,
      );

      await this.escalationInstRepo.save({
        slaInstance,
        definition: def,
        triggerAt,
      });
    }
  }
}
