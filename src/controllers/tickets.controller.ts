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
  async getTickets(@Query() query: GetTicketsQueryDto) {
    return this.ticketsService.getTickets(query);
  }

  @Get(':id')
  async getTicket(@Param('id') id: string) {
    return this.ticketsService.getTicketById(id);
  }

  @Patch(':id')
  async updateTicket(@Param('id') id: string, @Body() dto: any) {
    return this.ticketsService.updateTicket(id, dto);
  }

  @Post()
  async createTicket(@Body() dto: CreateTicketDto): Promise<Tickets> {
    return this.ticketsService.createTicket(dto);
  }

  @Post('/comment/:id/:requesterId')
  async createComment(
    @Param('id') id: string,
    @Param('requesterId') requesterId: string,
    @Body() dto: any,
  ): Promise<any> {
    return this.ticketsService.createComment(id, requesterId, dto);
  }
}
