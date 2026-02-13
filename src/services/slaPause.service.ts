import { Injectable } from '@nestjs/common';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { SlaPause } from 'src/entities/slaPause.entity';
import { Tickets, TicketState } from 'src/entities/tickets.entity';
import { Repository } from 'typeorm';
import { BusinessTimeService } from './businessTime.service';
import { IsNull } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class SlaPauseService {
  constructor(
    @InjectRepository(SlaInstance)
    private instanceRepo: Repository<SlaInstance>,

    @InjectRepository(SlaPause)
    private pauseRepo: Repository<SlaPause>,

    private businessTime: BusinessTimeService,
  ) {}

  private pauseStates = [
    TicketState.AWAITING_USER,
    TicketState.AWAITING_VENDOR,
  ];

  async handleStateChange(ticket: Tickets, prevState: TicketState) {
    const instances = await this.instanceRepo.find({
      where: { ticketId: ticket.id, breached: false },
    });

    const shouldPause = this.pauseStates.includes(ticket.state);
    const wasPaused = this.pauseStates.includes(prevState);

    if (shouldPause && !wasPaused) {
      await this.pause(instances);
    }

    if (!shouldPause && wasPaused) {
      await this.resume(instances);
    }
  }

  private async pause(instances: SlaInstance[]) {
    for (const inst of instances) {
      if (!inst.paused) {
        inst.paused = true;
        await this.instanceRepo.save(inst);

        await this.pauseRepo.save({
          slaInstance: inst,
          pausedAt: new Date(),
        });
      }
    }
  }

  private async resume(instances: SlaInstance[]) {
    for (const inst of instances) {
      const pause = await this.pauseRepo.findOne({
        where: {
          slaInstance: { id: inst.id },
          resumedAt: IsNull(),
        },
      });

      if (!pause) continue;

      pause.resumedAt = new Date();
      await this.pauseRepo.save(pause);

      inst.paused = false;

      inst.dueAt = await this.businessTime.addPauseTime(
        inst.dueAt,
        pause.pausedAt,
        pause.resumedAt!,
        inst.slaDefinition.calendar,
      );

      await this.instanceRepo.save(inst);
    }
  }

  async handleManualPause(ticketId: string) {
    const instances = await this.instanceRepo.find({ where: { ticketId } });
    await this.pause(instances);
  }

  async handleManualResume(ticketId: string) {
    const instances = await this.instanceRepo.find({ where: { ticketId } });
    await this.resume(instances);
  }
}
