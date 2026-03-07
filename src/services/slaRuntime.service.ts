import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlaEscalationInstance } from 'src/entities/slaEscalationInstance.entity';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SlaRuntimeService {
  constructor(
    @InjectRepository(SlaInstance)
    private readonly slaRepo: Repository<SlaInstance>,

    @InjectRepository(SlaEscalationInstance)
    private readonly escalationRepo: Repository<SlaEscalationInstance>,
  ) {}

  async getForTicket(ticketId: string) {
    const instances = await this.slaRepo.find({
      where: { ticketId },
      relations: ['slaDefinition'],
    });

    if (!instances.length) {
      throw new NotFoundException('No SLA for ticket');
    }

    const now = new Date();

    const result = instances.map((instance) => {
      const totalMinutes = instance.slaDefinition.targetMinutes;

      const remainingMinutes = Math.max(
        Math.ceil((instance.dueAt.getTime() - now.getTime()) / 60000),
        0,
      );

      const usedMinutes = Math.max(totalMinutes - remainingMinutes, 0);

      const usedPercentage = Math.min(
        Math.round((usedMinutes / totalMinutes) * 100),
        100,
      );

      const status = instance.breached
        ? 'BREACHED'
        : instance.paused
          ? 'PAUSED'
          : 'ACTIVE';

      return {
        id: instance.id,

        type: instance.slaDefinition.type,
        name: instance.slaDefinition.name,

        status,
        paused: instance.paused,
        breached: instance.breached,

        dueAt: instance.dueAt,
        remainingMinutes,
        usedPercentage,

        targetMinutes: totalMinutes,
      };
    });

    return {
      instances: result,
    };
  }
}
