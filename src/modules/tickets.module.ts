import { TypeOrmModule } from '@nestjs/typeorm';
import { Tickets } from 'src/entities/tickets.entity';
import { Module } from '@nestjs/common';
import { TicketsController } from 'src/controllers/tickets.controller';
import { TicketsService } from 'src/services/tickets.service';
import { TicketsGateway } from 'src/gateways/tickets.gateway';
import { TicketsComments } from 'src/entities/ticketsComments.entity';
import { TicketsApprovals } from 'src/entities/ticketsApprovals.entity';
import { TicketActivity } from 'src/entities/ticketActivity.entity';
import { AdminSettings } from 'src/entities/adminSettings.entity';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { TicketTemplate } from 'src/entities/ticketTemplate.entity';
import { TicketAutoTagRule } from 'src/entities/ticketAutoTagRule.entity';
import { SlaModule } from './sla.module';
import { AuditModule } from './audit.module';
import { NotificationModule } from './notification.module';
import { MailModule } from './mail.module';
import { TicketTemplateService } from 'src/services/ticketTemplate.service';
import { TicketTemplateController } from 'src/controllers/ticketTemplate.controller';
import { TicketAutoTagService } from 'src/services/ticketAutoTag.service';
import { TicketFollowupWorker } from 'src/workers/ticketFollowup.worker';
import { Logger, OnModuleInit } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tickets,
      TicketsComments,
      TicketsApprovals,
      TicketActivity,
      AdminSettings,
      SlaInstance,
      TicketTemplate,
      TicketAutoTagRule,
    ]),
    SlaModule,
    AuditModule,
    NotificationModule,
    MailModule,
  ],
  controllers: [TicketsController, TicketTemplateController],
  providers: [
    TicketsService,
    TicketsGateway,
    TicketTemplateService,
    TicketAutoTagService,
    TicketFollowupWorker,
  ],
  exports: [TicketsGateway],
})
export class TicketsModule implements OnModuleInit {
  private readonly logger = new Logger(TicketsModule.name);
  constructor(private readonly autoTag: TicketAutoTagService) {}
  async onModuleInit() {
    const inserted = await this.autoTag.seedDefaults();
    if (inserted > 0) {
      this.logger.log(`Seeded ${inserted} default ticket auto-tag rule(s)`);
    }
  }
}
