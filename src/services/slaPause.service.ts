import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, IsNull } from 'typeorm';

import { Tickets, TicketState } from 'src/entities/tickets.entity';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { SlaPause } from 'src/entities/slaPause.entity';
import { SlaEscalationInstance } from 'src/entities/slaEscalationInstance.entity';
import { BusinessTimeService } from './businessTime.service';
import { AuditService } from './audit.service';

@Injectable()
export class SlaPauseService {
  constructor(
    @InjectRepository(SlaInstance)
    private readonly instanceRepo: Repository<SlaInstance>,

    @InjectRepository(SlaPause)
    private readonly pauseRepo: Repository<SlaPause>,

    @InjectRepository(SlaEscalationInstance)
    private readonly escalationInstRepo: Repository<SlaEscalationInstance>,

    private readonly businessTime: BusinessTimeService,
    private readonly audit: AuditService,
  ) {}

  /*
   * =====================================================
   * AUTOMATYCZNA OBSŁUGA PAUSE PRZY ZMIANIE STATUSU
   * =====================================================
   */
  async handleStateChange(
    ticket: Tickets,
    prevState: TicketState,
    manager?: EntityManager,
  ) {
    const pauseStates = [
      TicketState.AWAITING_USER,
      TicketState.AWAITING_VENDOR,
    ];

    const instanceRepo = manager
      ? manager.getRepository(SlaInstance)
      : this.instanceRepo;

    const pauseRepo = manager
      ? manager.getRepository(SlaPause)
      : this.pauseRepo;

    const instances = await instanceRepo.find({
      where: { ticketId: ticket.id, breached: false },
      relations: ['slaDefinition', 'slaDefinition.calendar'],
    });

    const shouldPause = pauseStates.includes(ticket.state);
    const wasPaused = pauseStates.includes(prevState);

    // -------------------------
    // PAUSE
    // -------------------------
    if (shouldPause && !wasPaused) {
      for (const inst of instances) {
        if (inst.paused) continue;

        inst.paused = true;
        await instanceRepo.save(inst);

        await this.audit.log(
          'SLA_INSTANCE',
          inst.id,
          'SLA_PAUSED',
          {
            ticketId: ticket.id,
          },
          manager,
        );

        await pauseRepo.save({
          slaInstance: inst,
          pausedAt: new Date(),
        });
      }
    }

    // -------------------------
    // RESUME
    // -------------------------
    if (!shouldPause && wasPaused) {
      for (const inst of instances) {
        if (!inst.paused) continue;

        const pause = await pauseRepo.findOne({
          where: {
            slaInstance: { id: inst.id },
            resumedAt: IsNull(),
          },
          relations: ['slaInstance'],
        });

        if (!pause) continue;

        pause.resumedAt = new Date();
        await pauseRepo.save(pause);

        inst.paused = false;

        inst.dueAt = await this.businessTime.addPauseTime(
          inst.dueAt,
          pause.pausedAt,
          pause.resumedAt,
          inst.slaDefinition.calendar,
        );

        await instanceRepo.save(inst);

        await this.recalcEscalations(inst, pause, manager);

        await this.audit.log(
          'SLA_INSTANCE',
          inst.id,
          'SLA_RESUMED',
          {
            ticketId: ticket.id,
            resumedAt: pause.resumedAt,
          },
          manager,
        );
      }
    }
  }

  /*
   * =====================================================
   * MANUAL PAUSE (ADMIN API)
   * =====================================================
   */
  async handleManualPause(ticketId: string, manager?: EntityManager) {
    const instanceRepo = manager
      ? manager.getRepository(SlaInstance)
      : this.instanceRepo;

    const pauseRepo = manager
      ? manager.getRepository(SlaPause)
      : this.pauseRepo;

    const instances = await instanceRepo.find({
      where: { ticketId, breached: false },
    });

    for (const inst of instances) {
      if (inst.paused) continue;

      inst.paused = true;
      await instanceRepo.save(inst);

      await pauseRepo.save({
        slaInstance: inst,
        pausedAt: new Date(),
      });
    }
  }

  /*
   * =====================================================
   * MANUAL RESUME (ADMIN API)
   * =====================================================
   */
  async handleManualResume(ticketId: string, manager?: EntityManager) {
    const instanceRepo = manager
      ? manager.getRepository(SlaInstance)
      : this.instanceRepo;

    const pauseRepo = manager
      ? manager.getRepository(SlaPause)
      : this.pauseRepo;

    const instances = await instanceRepo.find({
      where: { ticketId, breached: false },
      relations: ['slaDefinition', 'slaDefinition.calendar'],
    });

    for (const inst of instances) {
      if (!inst.paused) continue;

      const pause = await pauseRepo.findOne({
        where: {
          slaInstance: { id: inst.id },
          resumedAt: IsNull(),
        },
        relations: ['slaInstance'],
      });

      if (!pause) continue;

      pause.resumedAt = new Date();
      await pauseRepo.save(pause);

      inst.paused = false;

      inst.dueAt = await this.businessTime.addPauseTime(
        inst.dueAt,
        pause.pausedAt,
        pause.resumedAt,
        inst.slaDefinition.calendar,
      );

      await instanceRepo.save(inst);

      await this.recalcEscalations(inst, pause, manager);
    }
  }

  /*
   * =====================================================
   * RECALCULATE ESCALATION TRIGGER TIMES AFTER RESUME
   * =====================================================
   */
  private async recalcEscalations(
    inst: SlaInstance,
    pause: SlaPause,
    manager?: EntityManager,
  ) {
    const escRepo = manager
      ? manager.getRepository(SlaEscalationInstance)
      : this.escalationInstRepo;

    const pendingEscalations = await escRepo.find({
      where: {
        slaInstance: { id: inst.id },
        triggered: false,
      },
    });

    const pauseMinutes = await this.businessTime.calculateBusinessMinutesBetween(
      pause.pausedAt,
      pause.resumedAt!,
      inst.slaDefinition.calendar,
    );

    for (const esc of pendingEscalations) {
      esc.triggerAt = await this.businessTime.calculateDueDate(
        esc.triggerAt,
        pauseMinutes,
        inst.slaDefinition.calendar,
      );
      await escRepo.save(esc);
    }
  }
}
