import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tickets } from 'src/entities/tickets.entity';
import {
  CreateTicketDto,
  GetTicketsQueryDto,
  UpdateTicketDto,
} from 'src/dto/tickets.dto';
import { TicketsGateway } from 'src/gateways/tickets.gateway';
import { TicketsComments } from 'src/entities/ticketsComments.entity';
import { TicketsApprovals } from 'src/entities/ticketsApprovals.entity';
import { SlaEngineService } from './slaEngine.service';
import { TicketActivity } from 'src/entities/ticketActivity.entity';
import { AdminSettings } from 'src/entities/adminSettings.entity';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { TicketAutoTagService } from './ticketAutoTag.service';
import { NotificationService } from './notification.service';
import { MailService } from './mail.service';
import { Users } from 'src/entities/users.entity';
import { AuditService } from './audit.service';
import { randomUUID as nodeRandomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const TRACKED_FIELDS = [
  'state',
  'priority',
  'impact',
  'urgency',
  'assignee',
  'assignmentGroup',
];

const ATTACHMENT_DIR = path.resolve(process.cwd(), 'uploads', 'tickets');

const ALLOWED_ATTACHMENT_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'video/mp4',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/webm',
  'audio/ogg',
]);

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Tickets)
    private ticketsRepository: Repository<Tickets>,

    @InjectRepository(TicketsComments)
    private ticketsCommentsRepository: Repository<TicketsComments>,

    @InjectRepository(TicketsApprovals)
    private ticketsApprovalsRepository: Repository<TicketsApprovals>,

    @InjectRepository(TicketActivity)
    private ticketActivityRepository: Repository<TicketActivity>,

    @InjectRepository(AdminSettings)
    private adminSettingsRepository: Repository<AdminSettings>,

    @InjectRepository(SlaInstance)
    private slaInstanceRepository: Repository<SlaInstance>,

    private readonly ticketsGateway: TicketsGateway,
    private readonly slaEngine: SlaEngineService,
    private readonly auditService: AuditService,
    private readonly autoTag: TicketAutoTagService,
    private readonly notifications: NotificationService,
    private readonly mail: MailService,
  ) {
    if (!fs.existsSync(ATTACHMENT_DIR)) {
      fs.mkdirSync(ATTACHMENT_DIR, { recursive: true });
    }
  }

  async generateTicketNumber(): Promise<number> {
    const result = await this.ticketsRepository.query(
      `SELECT nextval('ticket_number_seq')`,
    );

    return Number(result[0].nextval);
  }

  /*
   * ======================
   * CREATE TICKET + SLA START
   * ======================
   */
  async createTicket(dto: CreateTicketDto) {
    // Auto-suggest a category from the description if the agent didn't set
    // one — saves a click and reduces miscategorisation.
    let suggestedCategory: string | null = null;
    if (!(dto as any).category) {
      const suggestion = await this.autoTag.suggestCategory(
        `${(dto as any).description ?? ''} ${(dto as any).category ?? ''}`,
      );
      if (suggestion) {
        suggestedCategory = suggestion.category;
      }
    }

    const ticket = this.ticketsRepository.create({
      ...dto,
      ...(suggestedCategory ? { category: suggestedCategory } : {}),
      number: await this.generateTicketNumber(),
    });

    const saved = await this.ticketsRepository.save(ticket);

    if (suggestedCategory) {
      await this.auditService.log('Ticket', saved.id, 'auto_categorized', {
        category: suggestedCategory,
      });
    }

    // 🔥 START SLA
    await this.slaEngine.createForTicket(saved);

    await this.auditService.log('Ticket', saved.id, 'created', {
      ticketId: saved.id,
      number: saved.number,
      type: saved.type,
      requesterId: (dto as any).requesterId ?? null,
      category: (dto as any).category ?? null,
      priority: saved.priority,
      impact: saved.impact,
      urgency: saved.urgency,
    });

    return saved;
  }

  /*
   * ======================
   * UPDATE TICKET + SLA LIFECYCLE
   * ======================
   */
  async updateTicket(id: string, dto: UpdateTicketDto, userId?: string) {
    return this.ticketsRepository.manager.transaction(async (manager: any) => {
      const ticket = await manager.findOne(Tickets, {
        where: { id },
      });

      if (!ticket) throw new Error('Ticket not found');

      const previousState = ticket.state;
      const previousPriority = ticket.priority;

      // track field changes for activity log
      const changes: { field: string; oldValue: string; newValue: string }[] =
        [];

      for (const field of TRACKED_FIELDS) {
        if (dto[field] !== undefined && dto[field] !== ticket[field]) {
          changes.push({
            field,
            oldValue: ticket[field] ?? null,
            newValue: dto[field],
          });
        }
      }

      Object.assign(ticket, dto);

      const updated = await manager.save(ticket);

      // save activity entries
      const activityRepo = manager.getRepository(TicketActivity);
      const savedActivities: TicketActivity[] = [];

      for (const change of changes) {
        const activity = await activityRepo.save({
          ticketId: id,
          userId: userId ?? null,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        });
        savedActivities.push(activity);

        await this.auditService.log(
          'Ticket',
          id,
          'field_change',
          {
            ticketId: id,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            actor: userId ?? null,
            activityId: activity.id,
          },
          manager,
        );
      }

      // emit activities via websocket
      for (const activity of savedActivities) {
        this.ticketsGateway.emitTicketActivity(id, activity);
      }

      // przekazujemy manager do SLA Engine
      await this.slaEngine.handleStateChange(updated, previousState, manager);

      if (dto.priority && dto.priority !== previousPriority) {
        await this.slaEngine.handlePriorityChange(updated, manager);
      }

      if (dto.state === 'Resolved') {
        await this.slaEngine.handleResolved(updated, manager);
      }

      // Notify on assignment / state change. Best-effort, post-commit-ish.
      try {
        const ticketUrl = `/admin/helpdesk/${updated.id}`;
        const userRepo = manager.getRepository(Users);

        // Assignment changed → notify new assignee + email them.
        if (dto.assignee && dto.assignee !== ticket.assignee) {
          const newAssignee = await userRepo.findOneBy({ id: dto.assignee });
          if (newAssignee) {
            await this.notifications.create({
              recipientId: newAssignee.id,
              type: 'assignment',
              title: `Ticket #${updated.number} assigned to you`,
              body: updated.description?.slice(0, 200) ?? null,
              url: ticketUrl,
              entityType: 'Ticket',
              entityId: updated.id,
              actorId: userId ?? null,
            });
            if (newAssignee.email) {
              await this.mail.send({
                to: newAssignee.email,
                subject: `Ticket #${updated.number} assigned to you`,
                body: `You've been assigned ticket #${updated.number}.\n\n${updated.description ?? ''}`,
                category: 'ticket-assignment',
              });
            }
          }
        }

        // State change → email requester (so they know progress).
        if (dto.state && dto.state !== previousState) {
          const requester = await userRepo.findOneBy({
            id: updated.requesterId as any,
          });
          if (requester?.email) {
            await this.mail.send({
              to: requester.email,
              subject: `Ticket #${updated.number} status: ${dto.state}`,
              body: `Your ticket has moved from "${previousState}" to "${dto.state}".`,
              category: 'ticket-state',
            });
          }
        }
      } catch (err) {
        // notifications/mail are best-effort
      }

      return updated;
    });
  }

  /*
   * ======================
   * READ METHODS (bez zmian)
   * ======================
   */
  async getFilterOptions() {
    const FIELDS = ['assignee', 'assignmentGroup'];
    const options: Record<string, string[]> = {};
    for (const field of FIELDS) {
      const rows = await this.ticketsRepository
        .createQueryBuilder('t')
        .select(`DISTINCT t."${field}"`, 'value')
        .where(`t."${field}" IS NOT NULL AND t."${field}"::text != ''`)
        .orderBy('value', 'ASC')
        .getRawMany();
      options[field] = rows.map((r) => r.value);
    }
    return options;
  }

  async getTickets(query: GetTicketsQueryDto & { current?: any }) {
    const { page = 1, limit = 30, search, current, ...filters } = query as any;

    const qb = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester');

    if (
      current === 'true' ||
      current === true ||
      typeof current === 'undefined'
    ) {
      // domyślnie pokazuj tylko otwarte tickety
      const stateFilter = (filters as any).state;
      const hasExplicitState =
        stateFilter && (Array.isArray(stateFilter) ? stateFilter.length : true);
      if (!hasExplicitState) {
        qb.andWhere('ticket.state NOT IN (:...closedStates)', {
          closedStates: ['Closed', 'Cancelled'],
        });
      }
    }

    if (search) {
      qb.andWhere(
        `(ticket.description ILIKE :search
        OR ticket.number::text ILIKE :search
        OR ticket.category ILIKE :search
        OR ticket.type::text ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;

      if (Array.isArray(value)) {
        qb.andWhere(`ticket.${key} IN (:...${key})`, {
          [key]: value,
        });
      } else {
        qb.andWhere(`ticket.${key} = :${key}`, {
          [key]: value,
        });
      }
    });

    qb.orderBy('ticket.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    // Attach a compact SLA view per ticket — the earliest non-breached
    // dueAt, or the most severe breach if all are breached. Used by the
    // list UI to render a "breaches in X" column.
    if (data.length > 0) {
      const ids = data.map((t) => t.id);
      const slas = await this.slaInstanceRepository
        .createQueryBuilder('s')
        .where('s.ticket_id IN (:...ids)', { ids })
        .getMany();

      const byTicket = new Map<string, SlaInstance[]>();
      for (const s of slas) {
        const list = byTicket.get(s.ticketId) ?? [];
        list.push(s);
        byTicket.set(s.ticketId, list);
      }

      for (const ticket of data) {
        const list = byTicket.get(ticket.id) ?? [];
        if (list.length === 0) {
          (ticket as any).sla = null;
          continue;
        }
        const active = list.filter((s) => !s.breached && !s.paused);
        const chosen =
          active.length > 0
            ? active.reduce((a, b) =>
                a.dueAt.getTime() < b.dueAt.getTime() ? a : b,
              )
            : list.reduce((a, b) =>
                a.dueAt.getTime() < b.dueAt.getTime() ? a : b,
              );
        (ticket as any).sla = {
          dueAt: chosen.dueAt,
          paused: chosen.paused,
          breached: list.some((s) => s.breached),
        };
      }
    }

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Personal agent metrics for the current user. Returns counts and
   * derived measures the agent's dashboard cares about: workload, output,
   * latency, SLA hygiene, urgent items today.
   */
  async getAgentStats(userId: string) {
    if (!userId) {
      return {
        openAssigned: 0,
        resolvedToday: 0,
        resolvedThisWeek: 0,
        avgMttrHours: null,
        slaCompliancePct: null,
        breachingToday: 0,
      };
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(
      startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7),
    );
    const last30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [openAssigned, resolvedToday, resolvedThisWeek, recentResolved] =
      await Promise.all([
        this.ticketsRepository
          .createQueryBuilder('t')
          .where('t.assignee = :userId', { userId })
          .andWhere('t.state NOT IN (:...closed)', {
            closed: ['Resolved', 'Closed', 'Cancelled'],
          })
          .getCount(),
        this.ticketsRepository
          .createQueryBuilder('t')
          .where('t.assignee = :userId', { userId })
          .andWhere('t.resolvedAt >= :start', { start: startOfDay })
          .getCount(),
        this.ticketsRepository
          .createQueryBuilder('t')
          .where('t.assignee = :userId', { userId })
          .andWhere('t.resolvedAt >= :start', { start: startOfWeek })
          .getCount(),
        this.ticketsRepository
          .createQueryBuilder('t')
          .where('t.assignee = :userId', { userId })
          .andWhere('t.resolvedAt >= :start', { start: last30 })
          .select(['t.id', 't.createdAt', 't.resolvedAt'])
          .getMany(),
      ]);

    let avgMttrHours: number | null = null;
    if (recentResolved.length > 0) {
      const sum = recentResolved.reduce((acc, t) => {
        if (!t.resolvedAt) return acc;
        return (
          acc +
          (new Date(t.resolvedAt).getTime() -
            new Date(t.createdAt).getTime())
        );
      }, 0);
      avgMttrHours =
        Math.round((sum / recentResolved.length / 3600000) * 10) / 10;
    }

    // SLA compliance among recent resolved tickets — % that finished
    // without any breached SLA instance.
    let slaCompliancePct: number | null = null;
    if (recentResolved.length > 0) {
      const ids = recentResolved.map((t) => t.id);
      const breaches = await this.slaInstanceRepository
        .createQueryBuilder('s')
        .where('s.ticketId IN (:...ids)', { ids })
        .andWhere('s.breached = true')
        .select('DISTINCT s.ticketId', 'ticketId')
        .getRawMany();
      const breachedSet = new Set(breaches.map((b: any) => b.ticketId));
      const cleanCount = ids.filter((id) => !breachedSet.has(id)).length;
      slaCompliancePct = Math.round((cleanCount / ids.length) * 100);
    }

    // Tickets I own with an active SLA breaching today.
    const breachingTodayRows = await this.slaInstanceRepository
      .createQueryBuilder('s')
      .innerJoin('s.ticket', 't')
      .where('t.assignee = :userId', { userId })
      .andWhere('s.breached = false')
      .andWhere('s.paused = false')
      .andWhere('s.dueAt < :endOfDay', { endOfDay })
      .andWhere('t.state NOT IN (:...closed)', {
        closed: ['Resolved', 'Closed', 'Cancelled'],
      })
      .select('DISTINCT s.ticketId', 'ticketId')
      .getRawMany();

    return {
      openAssigned,
      resolvedToday,
      resolvedThisWeek,
      avgMttrHours,
      slaCompliancePct,
      breachingToday: breachingTodayRows.length,
    };
  }

  async getTicketsByRequester(userId: string, limit = 10) {
    return this.ticketsRepository
      .createQueryBuilder('t')
      .where('t.requesterId = :userId', { userId })
      .orderBy('t.createdAt', 'DESC')
      .limit(Math.min(limit, 50))
      .getMany();
  }

  async getTicketsByDevice(deviceId: string, limit = 10) {
    return this.ticketsRepository
      .createQueryBuilder('t')
      .where('t.deviceId = :deviceId', { deviceId })
      .orderBy('t.createdAt', 'DESC')
      .limit(Math.min(limit, 50))
      .getMany();
  }

  /**
   * Tickets that look similar to this one and have already been resolved.
   * Cheap match: same category + description token overlap (top 4 word
   * tokens longer than 3 chars used as ILIKE clauses).
   */
  async getSimilarResolvedTickets(ticketId: string, limit = 5) {
    const ticket = await this.ticketsRepository.findOneBy({ id: ticketId });
    if (!ticket) return [];

    const tokens = (ticket.description ?? '')
      .toLowerCase()
      .replace(/[^\p{L}0-9 ]+/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 3)
      .slice(0, 4);

    const qb = this.ticketsRepository
      .createQueryBuilder('t')
      .where('t.id != :id', { id: ticketId })
      .andWhere('t.state IN (:...closed)', {
        closed: ['Resolved', 'Closed'],
      });

    const conds: string[] = [];
    const params: Record<string, any> = {};
    if (ticket.category) {
      conds.push('t.category = :category');
      params.category = ticket.category;
    }
    tokens.forEach((tok, i) => {
      conds.push(`t.description ILIKE :tok${i}`);
      params[`tok${i}`] = `%${tok}%`;
    });

    if (conds.length > 0) {
      qb.andWhere(`(${conds.join(' OR ')})`, params);
    }

    return qb
      .orderBy('t.resolvedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('t.updatedAt', 'DESC')
      .limit(Math.min(limit, 20))
      .getMany();
  }

  /**
   * Link a ticket to a parent (e.g. mark as duplicate). Pass `null` to
   * unlink. Cycles are rejected. Activity is recorded so the agent's
   * action is visible in the ticket timeline.
   */
  async linkTicket(
    ticketId: string,
    parentTicketId: string | null,
    actorId: string,
  ) {
    const ticket: any = await this.ticketsRepository.findOneBy({
      id: ticketId,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (parentTicketId) {
      if (parentTicketId === ticketId) {
        throw new BadRequestException('Ticket cannot be its own parent');
      }
      const parent = await this.ticketsRepository.findOneBy({
        id: parentTicketId,
      });
      if (!parent) throw new NotFoundException('Parent ticket not found');
      // Block direct cycle (parent's parent points back to me).
      if (parent.parentTicketId === ticketId) {
        throw new BadRequestException('Linking would create a cycle');
      }
    }

    const oldParent = ticket.parentTicketId;
    ticket.parentTicketId = parentTicketId;
    await this.ticketsRepository.save(ticket);

    await this.ticketActivityRepository.save({
      id: nodeRandomUUID(),
      ticketId,
      userId: actorId,
      field: 'parentTicketId',
      oldValue: oldParent ?? null,
      newValue: parentTicketId ?? null,
    } as any);

    await this.auditService.log('Ticket', ticketId, 'linked', {
      actor: actorId,
      from: oldParent,
      to: parentTicketId,
    });

    return { id: ticket.id, parentTicketId };
  }

  async getTicketById(id: string) {
    return await this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester')
      .leftJoinAndSelect('ticket.device', 'device')
      .leftJoinAndSelect('ticket.comments', 'comments')
      .leftJoinAndSelect('ticket.approvals', 'approvals')
      .leftJoinAndSelect('ticket.activities', 'activities')
      .leftJoinAndSelect('ticket.parent', 'parent')
      .leftJoinAndSelect('ticket.children', 'children')
      .leftJoinAndSelect('comments.author', 'author')
      .leftJoinAndSelect('approvals.approver', 'approver')
      .leftJoinAndSelect('activities.user', 'activityUser')
      .where('ticket.id = :id', { id })
      .orderBy('comments.createdAt', 'ASC')
      .getOne();
  }

  /*
   * ======================
   * COMMENTS / APPROVALS
   * (bez SLA)
   * ======================
   */
  async createComment(ticketId: any, authorId: any, dto: any) {
    const comment = this.ticketsCommentsRepository.create({
      ticketId,
      authorId,
      content: dto.content,
      type: dto.type,
    });

    const saved = await this.ticketsCommentsRepository.save(comment);

    const withAuthor = await this.ticketsCommentsRepository.findOne({
      where: { id: saved.id },
      relations: ['author'],
    });

    this.ticketsGateway.emitNewComment(ticketId, withAuthor);

    // @mention notifications — best-effort, non-blocking on failure.
    try {
      const mentions = await this.notifications.resolveMentions(
        dto.content ?? '',
      );
      const ticket = await this.ticketsRepository.findOne({
        where: { id: ticketId },
        relations: ['requester'],
      });
      const url = `/admin/helpdesk/${ticketId}`;
      const inputs = mentions
        .filter((m) => m.userId !== authorId)
        .map((m) => ({
          recipientId: m.userId,
          type: 'mention' as const,
          title: `Mentioned on ticket #${ticket?.number ?? ''}`,
          body: (dto.content ?? '').slice(0, 200),
          url,
          entityType: 'Ticket',
          entityId: ticketId,
          actorId: authorId,
        }));
      if (inputs.length > 0) {
        await this.notifications.createMany(inputs);
      }

      // Email the requester on public comments from someone else.
      if (
        dto.type === 'Public' &&
        ticket?.requester?.email &&
        ticket.requester.id !== authorId &&
        !(dto.content ?? '').startsWith('__autoFollowup_reminded')
      ) {
        await this.mail.send({
          to: ticket.requester.email,
          subject: `New update on your ticket #${ticket.number}`,
          body: (dto.content ?? '').slice(0, 800),
          category: 'ticket-comment',
        });
      }
    } catch (err) {
      // Quiet failure — comment already committed.
    }

    return withAuthor;
  }

  async createCommentWithAttachment(
    ticketId: string,
    authorId: string,
    dto: { content?: string; type?: string },
    file: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_ATTACHMENT_MIME.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    const id = randomUUID();
    const ext = path.extname(file.originalname) || '';
    const storedName = `${id}${ext}`;
    const filePath = path.join(ATTACHMENT_DIR, storedName);
    fs.writeFileSync(filePath, file.buffer);

    const comment = this.ticketsCommentsRepository.create({
      ticketId,
      authorId,
      content: dto?.content ?? undefined,
      type: (dto?.type as any) ?? 'Public',
      attachmentName: file.originalname,
      attachmentPath: filePath,
      attachmentMimetype: file.mimetype,
      attachmentSize: file.size,
    });

    const saved = await this.ticketsCommentsRepository.save(comment);

    const withAuthor = await this.ticketsCommentsRepository.findOne({
      where: { id: saved.id },
      relations: ['author'],
    });

    this.ticketsGateway.emitNewComment(ticketId, withAuthor);

    return withAuthor;
  }

  async getAttachmentStream(commentId: string) {
    const comment = await this.ticketsCommentsRepository.findOne({
      where: { id: commentId },
    });
    if (!comment || !comment.attachmentPath) {
      throw new NotFoundException('Attachment not found');
    }
    if (!fs.existsSync(comment.attachmentPath)) {
      throw new NotFoundException('File not found on disk');
    }
    return {
      comment,
      stream: fs.createReadStream(comment.attachmentPath),
    };
  }

  async createApproval(ticketId: any, requesterId: any, approverId: any) {
    const approval = this.ticketsApprovalsRepository.create({
      ticketId,
      requesterId,
      approverId,
      createdAt: new Date(),
    });

    return this.ticketsApprovalsRepository.save(approval);
  }

  /*
   * ======================
   * MY TICKETS (requester-scoped)
   * ======================
   */
  async getMyTickets(requesterId: string, scope: 'open' | 'closed' = 'open') {
    const closedStates = ['Closed', 'Cancelled', 'Resolved'];

    const qb = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester')
      .where('ticket.requesterId = :requesterId', { requesterId });

    if (scope === 'open') {
      qb.andWhere('ticket.state NOT IN (:...closedStates)', { closedStates });
    } else {
      qb.andWhere('ticket.state IN (:...closedStates)', { closedStates });
    }

    qb.orderBy('ticket.updatedAt', 'DESC');
    return qb.getMany();
  }

  /*
   * ======================
   * TICKET CATEGORIES (managed via AdminSettings)
   * ======================
   */
  private readonly CATEGORY_KEY = 'ticket_categories';

  private defaultCategories(): {
    Incident: string[];
    Service: string[];
  } {
    return {
      Incident: [
        'Hardware issue',
        'Software issue',
        'Network issue',
        'Account / Access',
        'Security incident',
        'Other',
      ],
      Service: [
        'New equipment',
        'Software installation',
        'Account request',
        'Access request',
        'General question',
        'Other',
      ],
    };
  }

  async getTicketCategories() {
    const row = await this.adminSettingsRepository.findOne({
      where: { key: this.CATEGORY_KEY },
    });
    if (!row) return this.defaultCategories();
    return row.value ?? this.defaultCategories();
  }

  async updateTicketCategories(value: {
    Incident: string[];
    Service: string[];
  }) {
    let row = await this.adminSettingsRepository.findOne({
      where: { key: this.CATEGORY_KEY },
    });
    if (!row) {
      row = this.adminSettingsRepository.create({
        id: nodeRandomUUID(),
        key: this.CATEGORY_KEY,
        value,
      });
    } else {
      row.value = value;
    }
    await this.adminSettingsRepository.save(row);
    return row.value;
  }

  async updateApproval(id: any, dto: any, currentUserId?: string) {
    const approval = await this.ticketsApprovalsRepository.findOne({
      where: { id },
    });
    if (!approval) throw new NotFoundException('Approval not found');

    if (approval.decision) {
      throw new ForbiddenException('Approval has already been decided');
    }

    if (!currentUserId || currentUserId !== approval.approverId) {
      throw new ForbiddenException(
        'Only the assigned approver can decide on this approval',
      );
    }

    await this.ticketsApprovalsRepository.update(id, {
      ...dto,
      decidedAt: new Date(),
    });

    return this.ticketsApprovalsRepository.findOne({
      where: { id },
      relations: ['approver'],
    });
  }
}
