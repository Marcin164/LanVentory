import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SlaDefinition } from './slaDefinition.entity';

@Entity('sla_rule')
export class SlaRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  priority: string; // np. P1, P2

  @ManyToOne(() => SlaDefinition, (sla: any) => sla.rules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sla_definition_id' })
  slaDefinition: SlaDefinition;
}
