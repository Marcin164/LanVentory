import { Injectable } from '@nestjs/common';
import { Tickets, TicketState } from 'src/entities/tickets.entity';
import { SlaCreatorService } from './slaCreator.service';
import { SlaPauseService } from './slaPause.service';
import { SlaBreachService } from './slaBreach.service';

@Injectable()
export class SlaEngineService {
  constructor(
    private readonly creator: SlaCreatorService,
    private readonly pauseService: SlaPauseService,
    private readonly breachService: SlaBreachService,
  ) {}

  async createForTicket(ticket: Tickets) {
    await this.creator.createInstances(ticket);
  }

  async handleStateChange(ticket: Tickets, prevState: TicketState) {
    await this.pauseService.handleStateChange(ticket, prevState);
  }

  async handleResolved(ticket: Tickets) {
    await this.breachService.finishSla(ticket.id);
  }

  async handlePriorityChange(ticket: Tickets) {
    await this.creator.deleteInstancesForTicket(ticket.id);

    await this.creator.createInstances(ticket);
  }
}
