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
    const ticket = this.ticketsRepository.create({
      ...dto,
      number: await this.generateTicketNumber(),
    });

    const saved = await this.ticketsRepository.save(ticket);

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
    const {
      page = 1,
      limit = 30,
      search,
      current,
      ...filters
    } = query as any;

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

  async getTicketById(id: string) {
    return await this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester')
      .leftJoinAndSelect('ticket.device', 'device')
      .leftJoinAndSelect('ticket.comments', 'comments')
      .leftJoinAndSelect('ticket.approvals', 'approvals')
      .leftJoinAndSelect('ticket.activities', 'activities')
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
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}`,
      );
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
