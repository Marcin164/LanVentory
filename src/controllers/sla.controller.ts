import { Controller, Get, Param, Post } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { SlaEngineService } from 'src/services/slaEngine.service';
import { SlaBreachService } from 'src/services/slaBreach.service';
import { SlaPauseService } from 'src/services/slaPause.service';

@Controller('sla')
export class SlaAdminController {
  constructor(
    @InjectRepository(SlaInstance)
    private readonly slaRepo: Repository<SlaInstance>,
    private readonly engine: SlaEngineService,
    private readonly breachService: SlaBreachService,
    private readonly pauseService: SlaPauseService,
  ) {}

  // 🔎 SLA dla konkretnego ticketa
  @Get('ticket/:ticketId')
  async getTicketSla(@Param('ticketId') ticketId: string) {
    return this.slaRepo.find({
      where: { ticketId },
      relations: ['slaDefinition', 'slaDefinition.calendar'],
    });
  }

  // 🔎 Wszystkie aktywne SLA
  @Get('active')
  async getActive() {
    return this.slaRepo.find({
      where: {
        breached: false,
        paused: false,
      },
    });
  }

  // 🚨 Lista breach
  @Get('breaches')
  async getBreaches() {
    return this.slaRepo.find({
      where: { breached: true },
      relations: ['slaDefinition'],
    });
  }

  // 🛠 ręczne przeliczenie SLA
  @Post('recalculate/:ticketId')
  async recalc(@Param('ticketId') ticketId: string) {
    await this.engine.handleResolved({ id: ticketId } as any);
    return { message: 'SLA recalculated' };
  }

  // ⏸ ręczna pauza
  @Post('pause/:ticketId')
  async pause(@Param('ticketId') ticketId: string) {
    await this.pauseService.handleManualPause(ticketId);
    return { message: 'SLA paused' };
  }

  // ▶ ręczne wznowienie
  @Post('resume/:ticketId')
  async resume(@Param('ticketId') ticketId: string) {
    await this.pauseService.handleManualResume(ticketId);
    return { message: 'SLA resumed' };
  }
}
