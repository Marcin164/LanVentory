import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { SlaEngineService } from 'src/services/slaEngine.service';
import { AuthGuard } from 'src/guards/authGuard.guard';

@UseGuards(AuthGuard)
@Controller('sla/admin')
export class SlaAdminController {
  constructor(
    @InjectRepository(SlaInstance)
    private readonly slaRepo: Repository<SlaInstance>,
    private readonly engine: SlaEngineService,
  ) {}

  @Get('active')
  async getActive() {
    return this.slaRepo.find({
      where: {
        breached: false,
        paused: false,
      },
      relations: ['slaDefinition'],
    });
  }

  @Get('breaches')
  async getBreaches() {
    return this.slaRepo.find({
      where: { breached: true },
      relations: ['slaDefinition'],
    });
  }

  @Post('recalculate/:ticketId')
  async recalc(@Param('ticketId') ticketId: string) {
    await this.engine.handleResolved({ id: ticketId } as any);
    return { message: 'SLA recalculated' };
  }
}
