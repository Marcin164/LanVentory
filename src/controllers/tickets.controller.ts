import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateTicketDto, GetTicketsQueryDto } from 'src/dto/tickets.dto';
import { Tickets } from 'src/entities/tickets.entity';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { TicketsService } from 'src/services/tickets.service';

@UseGuards(AuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  getTickets(@Query() query: GetTicketsQueryDto) {
    return this.ticketsService.getTickets(query);
  }

  @Get(':id')
  getTicket(@Param('id') id: string) {
    return this.ticketsService.getTicketById(id);
  }

  @Patch(':id')
  updateTicket(@Param('id') id: string, @Body() dto: any) {
    return this.ticketsService.updateTicket(id, dto);
  }

  @Post()
  async createTicket(@Body() dto: CreateTicketDto): Promise<Tickets> {
    return this.ticketsService.createTicket(dto);
  }
}
