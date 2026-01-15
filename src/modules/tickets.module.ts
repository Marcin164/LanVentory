import { TypeOrmModule } from '@nestjs/typeorm';
import { Tickets } from 'src/entities/tickets.entity';
import { Module } from '@nestjs/common';
import { TicketsController } from 'src/controllers/tickets.controller';
import { TicketsService } from 'src/services/tickets.service';
import { TicketsGateway } from 'src/gateways/tickets.gateway';
import { TicketsComments } from 'src/entities/ticketsComments.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tickets, TicketsComments])],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsGateway],
  exports: [TicketsGateway],
})
export class TicketsModule {}
