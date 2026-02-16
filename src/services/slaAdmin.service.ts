import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SlaAdminService {
  constructor(
    @InjectRepository(SlaInstance)
    private readonly slaRepo: Repository<SlaInstance>,
  ) {}

  /**
   * Wszystkie aktywne SLA (monitoring)
   */
  async getActive() {
    return this.slaRepo.find({
      where: {
        breached: false,
        paused: false,
      },
      relations: ['slaDefinition'],
      order: {
        dueAt: 'ASC',
      },
    });
  }

  /**
   * Wszystkie breached SLA
   */
  async getBreaches() {
    return this.slaRepo.find({
      where: { breached: true },
      relations: ['slaDefinition'],
      order: {
        dueAt: 'DESC',
      },
    });
  }
}
