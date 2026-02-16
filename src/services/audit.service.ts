import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SystemAuditLog } from 'src/entities/systemAuditLog.entity';
import { Repository, EntityManager } from 'typeorm';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(SystemAuditLog)
    private readonly repo: Repository<SystemAuditLog>,
  ) {}

  async log(
    entityType: string,
    entityId: string,
    action: string,
    metadata?: Record<string, any>,
    manager?: EntityManager,
  ) {
    const repository = manager
      ? manager.getRepository(SystemAuditLog)
      : this.repo;

    await repository.save({
      entityType,
      entityId,
      action,
      metadata,
    });
  }

  async getForTicket(ticketId: string, action?: string) {
    const qb = this.repo.createQueryBuilder('a');

    qb.where(`(a.metadata->>'ticketId') = :ticketId`, { ticketId });

    if (action) {
      qb.andWhere('a.action = :action', { action });
    }

    qb.orderBy('a.createdAt', 'ASC');

    return qb.getMany();
  }

  async getForEntity(entityType: string, entityId: string) {
    return this.repo.find({
      where: {
        entityType,
        entityId,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }
}
