import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
} from 'src/entities/notification.entity';
import { Users } from 'src/entities/users.entity';
import { uuidv4 } from 'src/helpers/uuidv4';

export type CreateNotificationInput = {
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  url?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actorId?: string | null;
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(Users)
    private readonly users: Repository<Users>,
  ) {}

  private buildRow(input: CreateNotificationInput): Notification {
    const row = new Notification();
    row.id = uuidv4();
    row.recipientId = input.recipientId;
    row.type = input.type;
    row.title = input.title;
    row.body = input.body ?? null;
    row.url = input.url ?? null;
    row.entityType = input.entityType ?? null;
    row.entityId = input.entityId ?? null;
    row.actorId = input.actorId ?? null;
    row.readAt = null;
    return row;
  }

  async create(input: CreateNotificationInput): Promise<Notification> {
    return this.repo.save(this.buildRow(input));
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<number> {
    if (inputs.length === 0) return 0;
    const rows = inputs.map((i) => this.buildRow(i));
    await this.repo.save(rows);
    return rows.length;
  }

  async listForUser(
    userId: string,
    opts: { unreadOnly?: boolean; limit?: number } = {},
  ) {
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.recipientId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .limit(Math.min(opts.limit ?? 50, 200));
    if (opts.unreadOnly) qb.andWhere('n.readAt IS NULL');
    return qb.getMany();
  }

  async markRead(userId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('id IN (:...ids) AND recipientId = :userId AND readAt IS NULL', {
        ids,
        userId,
      })
      .execute();
    return result.affected ?? 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('recipientId = :userId AND readAt IS NULL', { userId })
      .execute();
    return result.affected ?? 0;
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({
      where: { recipientId: userId, readAt: null as any },
    });
  }

  /**
   * Resolve `@username` style mentions to user IDs. Looks up by `username`,
   * `email`, or `name surname` substring (case-insensitive). Returns the
   * set of recipientIds with their resolved mention text.
   */
  async resolveMentions(text: string): Promise<
    Array<{ userId: string; mention: string; label: string }>
  > {
    if (!text) return [];
    const tokens = Array.from(text.matchAll(/@([a-zA-Z0-9._-]{2,64})/g)).map(
      (m) => m[1],
    );
    if (tokens.length === 0) return [];

    const lowered = Array.from(new Set(tokens.map((t) => t.toLowerCase())));
    const candidates = await this.users
      .createQueryBuilder('u')
      .where(`LOWER(u.username) IN (:...tokens)`, { tokens: lowered })
      .orWhere(`LOWER(u.email) IN (:...tokens)`, { tokens: lowered })
      .getMany();

    const resolved: Array<{ userId: string; mention: string; label: string }> = [];
    for (const c of candidates) {
      const mention =
        tokens.find(
          (t) =>
            t.toLowerCase() === (c.username ?? '').toLowerCase() ||
            t.toLowerCase() === (c.email ?? '').toLowerCase(),
        ) ?? '';
      if (!mention) continue;
      resolved.push({
        userId: c.id,
        mention,
        label:
          [c.name, c.surname].filter(Boolean).join(' ') ||
          c.username ||
          c.email ||
          c.id,
      });
    }
    return resolved;
  }
}
