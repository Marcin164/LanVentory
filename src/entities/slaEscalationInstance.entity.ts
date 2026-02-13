import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SlaInstance } from './slaInstance.entity';
import { SlaEscalationDefinition } from './slaEscalationDefinition.entity';

@Entity('sla_escalation_instance')
export class SlaEscalationInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SlaInstance, (sla) => sla.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sla_instance_id' })
  slaInstance: SlaInstance;

  @Index()
  @Column({ type: 'timestamp' })
  triggerAt: Date;

  @Index()
  @Column({ default: false })
  triggered: boolean;

  @Column({ type: 'timestamp', nullable: true })
  triggeredAt: Date;

  @ManyToOne(() => SlaEscalationDefinition, (def) => def.instances)
  @JoinColumn({ name: 'escalation_definition_id' })
  definition: SlaEscalationDefinition;

  @Column({ type: 'timestamp', default: () => 'now()' })
  createdAt: Date;
}
