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
import { SlaModule } from './sla.module';
import { AuditModule } from './audit.module';
import { TicketTemplateService } from 'src/services/ticketTemplate.service';
import { TicketTemplateController } from 'src/controllers/ticketTemplate.controller';

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
    ]),
    SlaModule,
    AuditModule,
  ],
  controllers: [TicketsController, TicketTemplateController],
  providers: [TicketsService, TicketsGateway, TicketTemplateService],
  exports: [TicketsGateway],
})
export class TicketsModule {}
