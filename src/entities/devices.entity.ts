import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Devices {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  group: string;

  @Column()
  subgroup: string;

  @Column()
  ownerId: number;

  @Column()
  state: string;

  @Column()
  isOn: boolean;

  @Column()
  serialNumber: string;

  @Column()
  model: string;

  @Column()
  manufacturer: string;

  @Column()
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
