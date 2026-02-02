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
  ) {}
  async generateTicketNumber(): Promise<number> {
    const result = await this.ticketsRepository.query(
      `SELECT nextval('ticket_number_seq')`,
    );

    return Number(result[0].nextval);
  }

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

  async updateTicket(id: string, dto: UpdateTicketDto) {
    return await this.ticketsRepository.update(id, dto);
  }

  async createTicket(dto: CreateTicketDto) {
    const ticket = this.ticketsRepository.create({
      ...dto,
      number: await this.generateTicketNumber(),
    });

    return this.ticketsRepository.save(ticket);
  }

  async createComment(ticketId: any, authorId: any, dto: any) {
    const comment = this.ticketsCommentsRepository.create({
      ticketId,
      authorId,
      content: dto.content,
      type: dto.type,
    });

    const saved = await this.ticketsCommentsRepository.save(comment);

    console.log('[COMMENT SAVED]', saved.id, saved.content);

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

    const saved = await this.ticketsApprovalsRepository.save(approval);

    return saved;
  }

  async updateApproval(id: any, dto: any) {
    return await this.ticketsApprovalsRepository.update(id, {
      ...dto,
      decidedAt: new Date(),
    });
  }
}
