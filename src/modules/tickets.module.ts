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
import { SlaModule } from './sla.module';
import { AuditModule } from './audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tickets,
      TicketsComments,
      TicketsApprovals,
      TicketActivity,
      AdminSettings,
    ]),
    SlaModule,
    AuditModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsGateway],
  exports: [TicketsGateway],
})
export class TicketsModule {}
