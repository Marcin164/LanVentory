import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Devices {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  group: string;

  @Column({ nullable: true })
  subgroup: string;

  @Column({ nullable: true })
  ownerId: string;

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
}
