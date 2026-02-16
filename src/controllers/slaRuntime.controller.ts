import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { SlaPauseService } from '../services/slaPause.service';
import { SlaRuntimeService } from 'src/services/slaRuntime.service';

@UseGuards(AuthGuard)
@Controller('sla')
export class SlaRuntimeController {
  constructor(
    private readonly runtime: SlaRuntimeService,
    private readonly pauseService: SlaPauseService,
  ) {}

  // 🔥 GŁÓWNY ENDPOINT DLA FRONTENDU
  @Get('ticket/:ticketId')
  getRuntime(@Param('ticketId') ticketId: string) {
    return this.runtime.getForTicket(ticketId);
  }

  // ⏸ MANUAL PAUSE
  @Post('ticket/:ticketId/pause')
  async pause(@Param('ticketId') ticketId: string) {
    await this.pauseService.handleManualPause(ticketId);
    return { paused: true };
  }

  // ▶️ MANUAL RESUME
  @Post('ticket/:ticketId/resume')
  async resume(@Param('ticketId') ticketId: string) {
    await this.pauseService.handleManualResume(ticketId);
    return { resumed: true };
  }
}
