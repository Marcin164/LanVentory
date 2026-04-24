import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Devices } from './devices.entity';

/**
 * Immutable snapshot of what the agent reported in a single scan. The live
 * `devices.*` jsonb columns always reflect the latest; this table keeps the
 * chronology so we can diff "what changed" between two points in time.
 *
 * `snapshotSha256` is computed over the normalized JSON of the five jsonb
 * payloads — identical scans collapse to the same hash which makes dedup
 * trivial in reporting.
 */
@Entity()
@Index(['deviceId', 'receivedAt'])
export class DeviceScan {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column()
  deviceId: string;

  @ManyToOne(() => Devices, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: Devices;

  @Column({ type: 'timestamptz' })
  receivedAt: Date;

  @Column({ type: 'varchar', length: 64 })
  snapshotSha256: string;

  @Column({ type: 'jsonb', nullable: true })
  system: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  hardware: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  software: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  network: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  security: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  peripherals: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  users: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  eventLogs: Record<string, any> | null;
}
