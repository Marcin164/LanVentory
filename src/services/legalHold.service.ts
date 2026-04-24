import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { LegalHold } from 'src/entities/legalHold.entity';
import { AuditService } from 'src/services/audit.service';

export type CreateLegalHoldInput = {
  userId: string;
  reason: string;
  legalBasis?: string | null;
  retainUntil?: string | null;
  createdBy: string;
};

export type ReleaseLegalHoldInput = {
  id: string;
  releasedBy: string;
  releasedReason: string;
};

@Injectable()
export class LegalHoldService {
  constructor(
    @InjectRepository(LegalHold)
    private readonly repo: Repository<any>,
    private readonly audit: AuditService,
  ) {}

  async list(userId?: string, activeOnly = false) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (activeOnly) where.releasedAt = IsNull();
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async activeHolds(userId: string) {
    const now = new Date();
    const holds = await this.repo.find({
      where: { userId, releasedAt: IsNull() },
    });
    return holds.filter(
      (h) => h.retainUntil === null || new Date(h.retainUntil) > now,
    );
  }

  async hasActiveHold(userId: string) {
    return (await this.activeHolds(userId)).length > 0;
  }

  async create(input: CreateLegalHoldInput) {
    if (!input.reason?.trim()) {
      throw new BadRequestException('reason is required');
    }
    const hold = this.repo.create({
      userId: input.userId,
      reason: input.reason.trim(),
      legalBasis: input.legalBasis?.trim() || null,
      retainUntil: input.retainUntil ? new Date(input.retainUntil) : null,
      createdBy: input.createdBy,
      releasedAt: null,
      releasedBy: null,
      releasedReason: null,
    });
    const saved = await this.repo.save(hold);
    await this.audit.log('LegalHold', saved.id, 'created', {
      userId: saved.userId,
      reason: saved.reason,
      legalBasis: saved.legalBasis,
      retainUntil: saved.retainUntil,
      actor: input.createdBy,
    });
    return saved;
  }

  async release(input: ReleaseLegalHoldInput) {
    const hold = await this.repo.findOneBy({ id: input.id });
    if (!hold) throw new NotFoundException('Legal hold not found');
    if (hold.releasedAt) {
      throw new BadRequestException('Legal hold is already released');
    }
    if (!input.releasedReason?.trim()) {
      throw new BadRequestException('releasedReason is required');
    }
    hold.releasedAt = new Date();
    hold.releasedBy = input.releasedBy;
    hold.releasedReason = input.releasedReason.trim();
    const saved = await this.repo.save(hold);
    await this.audit.log('LegalHold', saved.id, 'released', {
      userId: saved.userId,
      actor: input.releasedBy,
      releasedReason: saved.releasedReason,
    });
    return saved;
  }
}
