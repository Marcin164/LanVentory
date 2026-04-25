import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Tickets, TicketState } from 'src/entities/tickets.entity';
import { TicketsComments } from 'src/entities/ticketsComments.entity';
import { AuditService } from 'src/services/audit.service';
import { uuidv4 } from 'src/helpers/uuidv4';

const REMIND_HOURS = Number(process.env.TICKET_AWAIT_REMIND_HOURS) || 48;
const AUTOCLOSE_HOURS = Number(process.env.TICKET_AWAIT_AUTOCLOSE_HOURS) || 168;
const REMIND_MARKER = '__autoFollowup_reminded';

@Injectable()
export class TicketFollowupWorker {
  private readonly logger = new Logger(TicketFollowupWorker.name);

  constructor(
    @InjectRepository(Tickets)
    private readonly tickets: Repository<Tickets>,
    @InjectRepository(TicketsComments)
    private readonly comments: Repository<TicketsComments>,
    private readonly audit: AuditService,
  ) {}

  /**
   * Daily 06:30 — pings users on tickets stuck in Awaiting and auto-closes
   * abandoned ones. The marker comment prevents double-pinging the same
   * stale ticket every day.
   */
  @Cron('30 6 * * *')
  async run() {
    try {
      const now = Date.now();
      const remindCutoff = new Date(now - REMIND_HOURS * 3600 * 1000);
      const closeCutoff = new Date(now - AUTOCLOSE_HOURS * 3600 * 1000);

      const candidates = await this.tickets.find({
        where: {
          state: TicketState.AWAITING_USER,
          updatedAt: LessThan(remindCutoff),
        },
      });

      let reminded = 0;
      let closed = 0;

      for (const t of candidates) {
        if (t.updatedAt < closeCutoff) {
          // Abandoned — auto-close.
          t.state = TicketState.CLOSED as any;
          t.closureCode = 'auto_no_response';
          t.closureNotes =
            `Closed automatically after ${AUTOCLOSE_HOURS}h with no user response.`;
          t.closedAt = new Date();
          await this.tickets.save(t);
          await this.audit.log('Ticket', t.id, 'auto_closed', {
            reason: 'no user response',
            hours: AUTOCLOSE_HOURS,
          });
          closed += 1;
          continue;
        }

        // Already pinged?
        const alreadyReminded = await this.comments.findOne({
          where: {
            ticket: { id: t.id } as any,
            content: REMIND_MARKER as any,
          },
        });
        if (alreadyReminded) continue;

        const reminder = this.comments.create({
          id: uuidv4(),
          ticket: { id: t.id } as any,
          content: `${REMIND_MARKER}\nFriendly reminder: this ticket is awaiting your response. If we don't hear back in ${
            (AUTOCLOSE_HOURS - REMIND_HOURS) / 24
          } more days it will be closed automatically.`,
          type: 'Public',
        } as any);
        await this.comments.save(reminder);
        await this.audit.log('Ticket', t.id, 'auto_followup_sent', {
          stage: 'reminder',
        });
        reminded += 1;
      }

      if (reminded || closed) {
        this.logger.log(
          `Followup sweep — reminded ${reminded}, closed ${closed}`,
        );
      }
    } catch (err) {
      this.logger.warn(`Followup sweep failed: ${(err as Error).message}`);
    }
  }
}
