import {
  Entity,
  Column,
  PrimaryColumn,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Users } from './users.entity';

export enum DeviceLifecycle {
  PROCUREMENT = 'procurement',
  ACTIVE = 'active',
  IN_REPAIR = 'in_repair',
  IN_STORAGE = 'in_storage',
  RETIRED = 'retired',
  DISPOSED = 'disposed',
  LOST = 'lost',
}

@Entity()
export class Devices {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  group: string;

  @Column({ nullable: true })
  subgroup: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => Users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: Users;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true, default: false })
  isOn: boolean;

  @Column({ nullable: true })
  serialNumber: string;

  @Column({ nullable: true })
  assetName: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'jsonb', nullable: true })
  system: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  hardware: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  software: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  network: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  users: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  security: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  peripherals: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  eventLogs: Record<string, any>;

  @Column({ type: 'varchar', length: 64, nullable: true })
  apiSecretHash: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  apiSecretHashPrev: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  apiSecretRotatedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  apiSecretPrevValidUntil: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastScanAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // ---- Asset lifecycle ----

  @Column({
    type: 'enum',
    enum: DeviceLifecycle,
    default: DeviceLifecycle.ACTIVE,
  })
  lifecycle: DeviceLifecycle;

  @Column({ type: 'text', nullable: true })
  lifecycleNote: string | null;

  @Column({ type: 'date', nullable: true })
  purchaseDate: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  purchasePrice: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  purchaseCurrency: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  vendor: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  purchaseOrder: string | null;

  @Column({ type: 'date', nullable: true })
  warrantyStart: string | null;

  @Column({ type: 'date', nullable: true })
  warrantyEnd: string | null;

  @Column({ type: 'date', nullable: true })
  retiredAt: string | null;

  @Column({ type: 'date', nullable: true })
  disposedAt: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  disposalMethod: string | null;
}
