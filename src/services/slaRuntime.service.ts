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

    const breached = instances.some((i) => i.breached);
    const paused = instances.some((i) => i.paused);

    const earliestDue = instances.reduce(
      (earliest, cur) => (cur.dueAt < earliest ? cur.dueAt : earliest),
      instances[0].dueAt,
    );

    const totalMinutes = instances.reduce(
      (sum, i) => sum + i.slaDefinition.targetMinutes,
      0,
    );

    const remainingMinutes = Math.max(
      Math.ceil((earliestDue.getTime() - now.getTime()) / 60000),
      0,
    );

    const usedPercentage = Math.min(
      Math.round(((totalMinutes - remainingMinutes) / totalMinutes) * 100),
      100,
    );

    const escalationsTriggered = await this.escalationRepo.count({
      where: {
        triggered: true,
        slaInstance: {
          ticketId,
        },
      },
      relations: ['slaInstance'],
    });

    return {
      status: breached ? 'BREACHED' : paused ? 'PAUSED' : 'ACTIVE',

      paused,
      breached,

      dueAt: earliestDue,
      remainingMinutes,
      usedPercentage,

      escalationsTriggered,

      slaDefinitions: instances.map((i) => ({
        name: i.slaDefinition.name,
        targetMinutes: i.slaDefinition.targetMinutes,
      })),
    };
  }
}
