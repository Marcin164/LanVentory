import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { SlaDefinition } from './slaDefinition.entity';
import { SlaPause } from './slaPause.entity';

@Entity()
export class SlaInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => SlaDefinition, (sla: any) => sla.instances)
  @JoinColumn({ name: 'sla_definition_id' })
  slaDefinition: SlaDefinition;

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Index()
  @Column({ type: 'timestamp' })
  dueAt: Date;

  @Column({ default: false })
  paused: boolean;

  @Index()
  @Column({ default: false })
  breached: boolean;

  @OneToMany(() => SlaPause, (pause: any) => pause.slaInstance)
  pauses: SlaPause[];
}
