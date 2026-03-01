import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SlaDefinition } from './slaDefinition.entity';

export enum TicketType {
  INCIDENT = 'Incident',
  SERVICE = 'Service',
}

@Entity()
export class SlaRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  priority: string;

  @Column({
    type: 'enum',
    enum: TicketType,
    nullable: true,
  })
  ticketType: TicketType | null; // null = any

  @ManyToOne(() => SlaDefinition, (sla: any) => sla.rules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'definitionId' })
  slaDefinition: SlaDefinition;
}
