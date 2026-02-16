import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
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

  /*
   * ========================
   * CREATE SLA
   * ========================
   */
  async createForTicket(ticket: Tickets, manager?: EntityManager) {
    await this.creator.createInstances(ticket, manager);
  }

  /*
   * ========================
   * STATE CHANGE
   * ========================
   */
  async handleStateChange(
    ticket: Tickets,
    prevState: TicketState,
    manager?: EntityManager,
  ) {
    await this.pauseService.handleStateChange(ticket, prevState, manager);
  }

  /*
   * ========================
   * RESOLVE
   * ========================
   */
  async handleResolved(ticket: Tickets, manager?: EntityManager) {
    await this.breachService.finishSla(ticket.id, manager);
  }

  /*
   * ========================
   * PRIORITY CHANGE
   * ========================
   */
  async handlePriorityChange(ticket: Tickets, manager?: EntityManager) {
    // usuń stare SLA instancje
    await this.creator.deleteInstancesForTicket(ticket.id, manager);

    // utwórz nowe w tej samej transakcji
    await this.creator.createInstances(ticket, manager);
  }
}
