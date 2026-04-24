import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  AgentTask,
  AgentTaskState,
  AgentTaskType,
} from 'src/entities/agentTask.entity';
import { uuidv4 } from 'src/helpers/uuidv4';

const DEFAULT_LEASE_MS = 15 * 60 * 1000;

@Injectable()
export class AgentTaskService {
  private readonly logger = new Logger(AgentTaskService.name);

  constructor(
    @InjectRepository(AgentTask)
    private readonly repo: Repository<AgentTask>,
    private readonly dataSource: DataSource,
  ) {}

  async enqueue(input: {
    deviceId: string;
    type: AgentTaskType;
    payload?: Record<string, any>;
    requestedBy?: string;
  }): Promise<AgentTask> {
    const row = this.repo.create({
      id: uuidv4(),
      deviceId: input.deviceId,
      type: input.type,
      payload: input.payload ?? null,
      state: 'queued',
      leaseToken: null,
      leasedAt: null,
      leasedUntil: null,
      completedAt: null,
      result: null,
      attempts: 0,
      lastError: null,
      requestedBy: input.requestedBy,
    });
    return this.repo.save(row);
  }

  async enqueueBulk(input: {
    deviceIds: string[];
    type: AgentTaskType;
    payload?: Record<string, any>;
    requestedBy?: string;
  }): Promise<number> {
    if (input.deviceIds.length === 0) return 0;
    let created = 0;
    for (const deviceId of input.deviceIds) {
      await this.enqueue({
        deviceId,
        type: input.type,
        payload: input.payload,
        requestedBy: input.requestedBy,
      });
      created += 1;
    }
    return created;
  }

  async listForDevice(
    deviceId: string,
    opts: { state?: AgentTaskState; limit?: number } = {},
  ) {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.deviceId = :deviceId', { deviceId })
      .orderBy('t.createdAt', 'DESC');
    if (opts.state) qb.andWhere('t.state = :state', { state: opts.state });
    qb.limit(Math.min(opts.limit ?? 50, 200));
    return qb.getMany();
  }

  /**
   * Agent pulls queued tasks for itself. Takes a short lease so that a
   * lost agent (crash mid-task) doesn't block retries forever. Uses
   * SELECT ... FOR UPDATE SKIP LOCKED inside a transaction so concurrent
   * agents on the same device can't double-claim.
   */
  async claimForDevice(
    deviceId: string,
    maxCount = 5,
    leaseMs = DEFAULT_LEASE_MS,
  ): Promise<AgentTask[]> {
    return this.dataSource.transaction(async (em) => {
      const repo = em.getRepository(AgentTask);
      const candidates = await repo
        .createQueryBuilder('t')
        .where('t.deviceId = :deviceId', { deviceId })
        .andWhere('t.state = :state', { state: 'queued' })
        .orderBy('t.createdAt', 'ASC')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .limit(Math.min(maxCount, 20))
        .getMany();

      if (candidates.length === 0) return [];

      const now = new Date();
      const leaseToken = randomBytes(16).toString('hex');
      const leasedUntil = new Date(now.getTime() + leaseMs);

      for (const task of candidates) {
        task.state = 'leased';
        task.leaseToken = leaseToken;
        task.leasedAt = now;
        task.leasedUntil = leasedUntil;
        task.attempts += 1;
        await repo.save(task);
      }
      return candidates;
    });
  }

  async complete(
    taskId: string,
    leaseToken: string,
    result: Record<string, any> | null,
  ): Promise<AgentTask> {
    const task = await this.repo.findOneBy({ id: taskId });
    if (!task) throw new NotFoundException('Task not found');
    if (task.state !== 'leased' || task.leaseToken !== leaseToken) {
      throw new BadRequestException('Task lease is invalid or expired');
    }
    task.state = 'completed';
    task.completedAt = new Date();
    task.result = result;
    task.leaseToken = null;
    task.leasedUntil = null;
    return this.repo.save(task);
  }

  async fail(
    taskId: string,
    leaseToken: string,
    error: string,
  ): Promise<AgentTask> {
    const task = await this.repo.findOneBy({ id: taskId });
    if (!task) throw new NotFoundException('Task not found');
    if (task.state !== 'leased' || task.leaseToken !== leaseToken) {
      throw new BadRequestException('Task lease is invalid or expired');
    }
    task.state = task.attempts >= 3 ? 'failed' : 'queued';
    task.leaseToken = null;
    task.leasedUntil = null;
    task.lastError = error.slice(0, 2000);
    return this.repo.save(task);
  }

  async cancel(taskId: string): Promise<AgentTask> {
    const task = await this.repo.findOneBy({ id: taskId });
    if (!task) throw new NotFoundException('Task not found');
    if (task.state === 'completed' || task.state === 'cancelled') return task;
    task.state = 'cancelled';
    task.leaseToken = null;
    task.leasedUntil = null;
    return this.repo.save(task);
  }

  /**
   * Release leases where the agent went silent — sends them back to the
   * queue so the next claim picks them up. Runs periodically.
   */
  async releaseExpiredLeases(): Promise<number> {
    const expired = await this.repo.find({
      where: { state: 'leased', leasedUntil: LessThan(new Date()) },
    });
    for (const t of expired) {
      t.state = t.attempts >= 3 ? 'expired' : 'queued';
      t.leaseToken = null;
      t.leasedUntil = null;
      t.lastError = 'lease expired';
      await this.repo.save(t);
    }
    return expired.length;
  }
}
