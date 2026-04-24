import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Devices } from './devices.entity';

export type AgentTaskType =
  | 'scan_now'
  | 'collect_event_log'
  | 'inventory_refresh'
  | 'custom';

export type AgentTaskState =
  | 'queued'
  | 'leased'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

@Entity()
@Index(['deviceId', 'state'])
@Index(['state', 'leasedUntil'])
export class AgentTask {
  @PrimaryColumn()
  id: string;

  @Column()
  deviceId: string;

  @ManyToOne(() => Devices, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: Devices;

  @Column({ type: 'varchar', length: 32 })
  type: AgentTaskType;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'varchar', length: 16, default: 'queued' })
  state: AgentTaskState;

  @Column({ type: 'varchar', length: 64, nullable: true })
  leaseToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  leasedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  leasedUntil: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any> | null;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ nullable: true })
  requestedBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
