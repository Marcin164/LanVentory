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
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

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

    private readonly ticketsGateway: TicketsGateway,
    private readonly slaEngine: SlaEngineService,
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

    return saved;
  }

  /*
   * ======================
   * UPDATE TICKET + SLA LIFECYCLE
   * ======================
   */
  async updateTicket(id: string, dto: UpdateTicketDto) {
    return this.ticketsRepository.manager.transaction(async (manager: any) => {
      const ticket = await manager.findOne(Tickets, {
        where: { id },
      });

      if (!ticket) throw new Error('Ticket not found');

      const previousState = ticket.state;
      const previousPriority = ticket.priority;

      Object.assign(ticket, dto);

      const updated = await manager.save(ticket);

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
      .leftJoinAndSelect('comments.author', 'author')
      .leftJoinAndSelect('approvals.approver', 'approver')
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
