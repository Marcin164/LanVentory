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
  ) {}

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
  async getTickets(query: GetTicketsQueryDto) {
    const { page = 1, limit = 30, search, ...filters } = query;

    const qb = this.ticketsRepository.createQueryBuilder('ticket');

    if (search) {
      qb.andWhere(
        `(ticket.description ILIKE :search
        OR ticket.number::text ILIKE :search
        OR ticket.category ILIKE :search)`,
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

    this.ticketsGateway.emitNewComment(dto.ticketId, saved);

    return saved;
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

  async updateApproval(id: any, dto: any) {
    return await this.ticketsApprovalsRepository.update(id, {
      ...dto,
      decidedAt: new Date(),
    });
  }
}
