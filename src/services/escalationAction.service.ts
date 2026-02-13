import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Tickets } from 'src/entities/tickets.entity';
import { SlaEscalationInstance } from 'src/entities/slaEscalationInstance.entity';

enum EscalationActionType {
  NOTIFY = 'NOTIFY',
  REASSIGN = 'REASSIGN',
  PRIORITY_UP = 'PRIORITY_UP',
}

@Injectable()
export class EscalationActionService {
  constructor(
    @InjectRepository(Tickets)
    private ticketsRepo: Repository<Tickets>,
  ) {}

  async execute(escalation: SlaEscalationInstance) {
    const actionType = escalation.definition.actionType;
    const config = escalation.definition.actionConfig;

    const ticketId = escalation.slaInstance.ticketId;

    switch (actionType) {
      case EscalationActionType.NOTIFY:
        await this.notify(ticketId, config);
        break;

      case EscalationActionType.REASSIGN:
        await this.reassign(ticketId, config);
        break;

      case EscalationActionType.PRIORITY_UP:
        await this.increasePriority(ticketId, config);
        break;
    }
  }

  private async notify(ticketId: string, config: any) {
    console.log(`[ESCALATION NOTIFY] Ticket ${ticketId}`, config);
    // tu możesz podpiąć mail / websocket
  }

  private async reassign(ticketId: string, config: any) {
    await this.ticketsRepo.update(ticketId, {
      assignmentGroup: config?.group,
    });
  }

  private async increasePriority(ticketId: string, config: any) {
    await this.ticketsRepo.update(ticketId, {
      priority: config?.to,
    });
  }
}
