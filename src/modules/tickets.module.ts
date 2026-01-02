import { TypeOrmModule } from '@nestjs/typeorm';
import { Tickets } from 'src/entities/tickets.entity';
import { Module } from '@nestjs/common';
import { TicketsController } from 'src/controllers/tickets.controller';
import { TicketsService } from 'src/services/tickets.service';
import { TicketComments } from 'src/entities/ticketsComments.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tickets, TicketComments])],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
