import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { AuditService } from 'src/services/audit.service';

@Injectable()
export class SlaBreachWorker {
  constructor(
    @InjectRepository(SlaInstance)
    private readonly slaRepo: Repository<SlaInstance>,

    private readonly audit: AuditService,
  ) {}

  @Cron('* * * * *')
  async handle() {
    const now = new Date();

    const overdue = await this.slaRepo.find({
      where: {
        breached: false,
        paused: false,
        dueAt: LessThanOrEqual(now),
      },
    });

    for (const inst of overdue) {
      inst.breached = true;
      await this.slaRepo.save(inst);

      await this.audit.log('SLA_INSTANCE', inst.id, 'SLA_BREACHED', {
        ticketId: inst.ticketId,
        dueAt: inst.dueAt,
      });
    }
  }
}
