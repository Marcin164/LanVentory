import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SlaBreachService {
  constructor(
    @InjectRepository(SlaInstance)
    private repo: Repository<SlaInstance>,
  ) {}

  async detectBreaches() {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ breached: true })
      .where('breached = false')
      .andWhere('paused = false')
      .andWhere('due_at < now()')
      .execute();
  }

  async finishSla(ticketId: string) {
    const instances = await this.repo.find({ where: { ticketId } });

    for (const inst of instances) {
      inst.breached = new Date() > inst.dueAt;
      await this.repo.save(inst);
    }
  }
}
