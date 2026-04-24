import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketTemplate } from 'src/entities/ticketTemplate.entity';
import { uuidv4 } from 'src/helpers/uuidv4';

@Injectable()
export class TicketTemplateService {
  constructor(
    @InjectRepository(TicketTemplate)
    private readonly repo: Repository<TicketTemplate>,
  ) {}

  async listForUser(userId: string | null) {
    const qb = this.repo
      .createQueryBuilder('t')
      .orderBy('t.category', 'ASC')
      .addOrderBy('t.name', 'ASC');
    if (userId) {
      qb.where('t.shared = true OR t.createdBy = :userId', { userId });
    } else {
      qb.where('t.shared = true');
    }
    return qb.getMany();
  }

  async create(
    input: {
      name: string;
      body: string;
      category?: string;
      shared?: boolean;
    },
    createdBy: string,
  ) {
    if (!input.name?.trim() || !input.body?.trim()) {
      throw new BadRequestException('name and body are required');
    }
    const row = this.repo.create({
      id: uuidv4(),
      name: input.name.trim(),
      body: input.body,
      category: (input.category ?? 'general').trim() || 'general',
      shared: input.shared ?? true,
      createdBy,
    });
    return this.repo.save(row);
  }

  async update(
    id: string,
    patch: Partial<Pick<TicketTemplate, 'name' | 'body' | 'category' | 'shared'>>,
    actor: string,
  ) {
    const row = await this.repo.findOneBy({ id });
    if (!row) throw new NotFoundException('Template not found');
    if (!row.shared && row.createdBy !== actor) {
      throw new BadRequestException(
        'You can only edit your own templates, or ask its owner',
      );
    }
    Object.assign(row, patch);
    return this.repo.save(row);
  }

  async remove(id: string, actor: string) {
    const row = await this.repo.findOneBy({ id });
    if (!row) throw new NotFoundException('Template not found');
    if (!row.shared && row.createdBy !== actor) {
      throw new BadRequestException('Only the owner can delete this template');
    }
    await this.repo.delete({ id });
  }
}
