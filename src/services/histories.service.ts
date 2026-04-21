import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { uuidv4 } from 'src/helpers/uuidv4';
import { Histories } from 'src/entities/histories.entity';
import { HistoryApprovers } from 'src/entities/historyApprovers.entity';
import { HistoryComponents } from 'src/entities/historyComponents.entity';
import { toCsv } from 'src/helpers/csv';
import { AuditService } from './audit.service';

export interface HistoryFeedQuery {
  limit?: number | string;
  cursor?: string;
  types?: string | string[];
  from?: string;
  to?: string;
  q?: string;
  deviceId?: string;
  userId?: string;
}

interface HistoryFeedCursor {
  date: string;
  id: string;
}

const MAX_FEED_LIMIT = 100;
const DEFAULT_FEED_LIMIT = 30;
const CSV_EXPORT_LIMIT = 50_000;

const HISTORY_TYPE_LABELS: Record<number, string> = {
  0: 'Owner change',
  1: 'Repair',
  2: 'Rebuild',
  3: 'Component replacement',
  4: 'Other',
};

const decodeCursor = (raw?: string): HistoryFeedCursor | null => {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (typeof parsed?.date === 'string' && typeof parsed?.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
};

const encodeCursor = (cursor: HistoryFeedCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');

@Injectable()
export class HistoriesService {
  constructor(
    @InjectRepository(Histories)
    private historiesRepository: Repository<Histories>,

    @InjectRepository(HistoryApprovers)
    private historyApproversRepository: Repository<HistoryApprovers>,

    @InjectRepository(HistoryComponents)
    private historyComponentsRepository: Repository<HistoryComponents>,

    private readonly auditService: AuditService,
  ) {}

  async findAll(): Promise<Histories[]> {
    return this.historiesRepository.find();
  }

  private buildFeedQuery(query: HistoryFeedQuery): SelectQueryBuilder<Histories> {
    const typesRaw = query.types;
    const types = (Array.isArray(typesRaw) ? typesRaw : typesRaw ? [typesRaw] : [])
      .map((t) => parseInt(String(t), 10))
      .filter((n) => !Number.isNaN(n));

    const qb = this.historiesRepository
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.user', 'user')
      .leftJoinAndSelect('h.device', 'device')
      .leftJoinAndSelect('h.approvers', 'approvers')
      .leftJoinAndSelect('approvers.user', 'approverUser')
      .leftJoinAndSelect('h.components', 'components')
      .leftJoinAndSelect('components.device', 'componentDevice')
      .orderBy('h.date', 'DESC')
      .addOrderBy('h.id', 'DESC');

    if (types.length > 0) {
      qb.andWhere('h.type IN (:...types)', { types });
    }

    if (query.from) {
      qb.andWhere('h.date >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('h.date <= :to', { to: query.to });
    }

    if (query.deviceId) {
      qb.andWhere('h.deviceId = :deviceId', { deviceId: query.deviceId });
    }

    if (query.userId) {
      qb.andWhere('h.userId = :userId', { userId: query.userId });
    }

    if (query.q) {
      const q = `%${query.q.trim()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where('h.ticket ILIKE :q', { q })
            .orWhere('h.details ILIKE :q', { q })
            .orWhere('h.justification ILIKE :q', { q })
            .orWhere('user.distinguishedName ILIKE :q', { q })
            .orWhere('user.name ILIKE :q', { q })
            .orWhere('user.surname ILIKE :q', { q })
            .orWhere('device.serialNumber ILIKE :q', { q })
            .orWhere('device.manufacturer ILIKE :q', { q })
            .orWhere('device.model ILIKE :q', { q })
            .orWhere('device.assetName ILIKE :q', { q });
        }),
      );
    }

    return qb;
  }

  private shapeRow(h: any) {
    return {
      ...h,
      components: (h.components ?? []).map((c: any) => ({
        id: c.id,
        historyId: c.historyId,
        deviceId: c.deviceId,
        type: c.type,
        location: c.device?.location ?? null,
        manufacturer: c.device?.manufacturer ?? null,
        serialNumber: c.device?.serialNumber ?? null,
        assetName: c.device?.assetName ?? null,
        group: c.device?.group ?? null,
        subgroup: c.device?.subgroup ?? null,
        model: c.device?.model ?? null,
      })),
    };
  }

  async findFeed(query: HistoryFeedQuery): Promise<{
    data: any[];
    nextCursor: string | null;
  }> {
    const limit = Math.min(
      Math.max(parseInt(String(query.limit ?? ''), 10) || DEFAULT_FEED_LIMIT, 1),
      MAX_FEED_LIMIT,
    );

    const cursor = decodeCursor(query.cursor);
    const qb = this.buildFeedQuery(query).take(limit + 1);

    if (cursor) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('h.date < :cursorDate', { cursorDate: cursor.date }).orWhere(
            new Brackets((b2) => {
              b2.where('h.date = :cursorDate', { cursorDate: cursor.date }).andWhere(
                'h.id < :cursorId',
                { cursorId: cursor.id },
              );
            }),
          );
        }),
      );
    }

    const rows = await qb.getMany();

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const shaped = pageRows.map((h) => this.shapeRow(h));

    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ date: last.date, id: last.id }) : null;

    return {
      data: shaped,
      nextCursor,
    };
  }

  async exportFeedCsv(query: HistoryFeedQuery): Promise<{
    filename: string;
    csv: string;
  }> {
    const qb = this.buildFeedQuery(query).take(CSV_EXPORT_LIMIT);
    const rows = await qb.getMany();

    const flat = rows.map((h: any) => ({
      date: h.date,
      type: HISTORY_TYPE_LABELS[h.type] ?? h.type,
      ticket: h.ticket ?? '',
      user: h.user?.distinguishedName ?? '',
      device:
        h.device?.assetName ??
        [h.device?.manufacturer, h.device?.model].filter(Boolean).join(' ') ??
        '',
      deviceSerial: h.device?.serialNumber ?? '',
      details: h.details ?? '',
      justification: h.justification ?? '',
      isUserFault: h.isUserFault ? 'Yes' : '',
      damages: h.damages ?? '',
      fixes: h.fixes ?? '',
      approvers: (h.approvers ?? [])
        .map((a: any) => a.user?.distinguishedName)
        .filter(Boolean)
        .join('; '),
      components: (h.components ?? [])
        .map(
          (c: any) =>
            `${c.type === 'remove' ? '-' : '+'} ${c.device?.manufacturer ?? ''} ${c.device?.model ?? ''} (${c.device?.serialNumber ?? ''})`.trim(),
        )
        .join('; '),
    }));

    return {
      filename: `history-export-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: toCsv(flat),
    };
  }

  async createHistory(history: any): Promise<any> {
    const historyId = uuidv4();

    const savedHistory = await this.historiesRepository.save({
      id: historyId,
      userId: history?.userId,
      justification: history?.justification || '',
      ticket: history?.ticket || '',
      details: history?.details || '',
      date: history?.date || '',
      deviceId: history?.deviceId || '',
      type: history?.type || 0,
      agent: history?.agent || '',
      isUserFault: history?.isUserFault || '',
      fixes: history?.fixes || '',
      damages: history?.damages || '',
    });

    if (history?.type === 3) {
      if (history.removedComponents?.length > 0) {
        const removedComponentsToSave = history.removedComponents.map(
          (component: any) => ({
            id: uuidv4(),
            historyId: historyId,
            deviceId: component.deviceId,
            type: 'remove',
          }),
        );

        await this.historyComponentsRepository.save(removedComponentsToSave);
      }

      if (history.addedComponents?.length > 0) {
        const addedComponentsToSave = history.addedComponents.map(
          (component: any) => ({
            id: uuidv4(),
            historyId: historyId,
            deviceId: component,
            type: 'added',
          }),
        );

        await this.historyComponentsRepository.save(addedComponentsToSave);
      }
    }

    if (history.approvers && history.approvers.length > 0) {
      const approversToSave = history.approvers.map((approver: any) => ({
        id: uuidv4(),
        historyId: historyId,
        userId: approver,
      }));

      await this.historyApproversRepository.save(approversToSave);
    }

    await this.auditService.log('History', historyId, 'created', {
      historyId,
      type: savedHistory.type,
      userId: savedHistory.userId,
      deviceId: savedHistory.deviceId,
      ticket: savedHistory.ticket,
      agent: savedHistory.agent,
      isUserFault: savedHistory.isUserFault,
      addedComponentsCount: history?.addedComponents?.length ?? 0,
      removedComponentsCount: history?.removedComponents?.length ?? 0,
      approversCount: history?.approvers?.length ?? 0,
    });

    return savedHistory;
  }

  async findDeviceHistory(deviceId: string): Promise<any[]> {
    const histories = await this.historiesRepository.find({
      where: { deviceId },
      relations: {
        user: true,
        components: {
          device: true,
        },
      },
      select: {
        components: {
          device: {
            location: true,
            manufacturer: true,
            serialNumber: true,
            assetName: true,
            group: true,
            subgroup: true,
            model: true,
          },
        },
        user: true,
        date: true,
        details: true,
        agent: true,
        justification: true,
        type: true,
        isUserFault: true,
        fixes: true,
        damages: true,
      },
    });

    histories.forEach((h: any) => {
      h.components = h.components.map((c: any) => ({
        id: c.id,
        historyId: c.historyId,
        deviceId: c.deviceId,
        type: c.type,
        location: c.device?.location ?? null,
        manufacturer: c.device?.manufacturer ?? null,
        serialNumber: c.device?.serialNumber ?? null,
        assetName: c.device?.assetName ?? null,
        group: c.device?.group ?? null,
        subgroup: c.device?.subgroup ?? null,
        model: c.device?.model ?? null,
      }));
    });

    return histories;
  }

  async findUserHistory(userId: string): Promise<any[]> {
    const histories = await this.historiesRepository
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.device', 'device')
      .where('h.userId = :userId', { userId })
      .getMany();

    return histories;
  }
}
