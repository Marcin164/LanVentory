import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tickets } from 'src/entities/tickets.entity';
import {
  CreateTicketDto,
  GetTicketsQueryDto,
  UpdateTicketDto,
} from 'src/dto/tickets.dto';
import { uuidv4 } from 'src/helpers/uuidv4';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Tickets)
    private ticketsRepository: Repository<Tickets>,
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
    return this.ticketsRepository.findOne({
      where: { id },
      relations: ['requester', 'comments', 'device'],
      order: {
        comments: {
          createdAt: 'ASC',
        },
      },
    });
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
}
