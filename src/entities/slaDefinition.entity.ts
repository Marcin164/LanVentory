import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Calendar } from './calendar.entity';
import { SlaRule } from './slaRule.entity';
import { SlaInstance } from './slaInstance.entity';
import { SlaEscalationDefinition } from './slaEscalationDefinition.entity';

export enum SlaType {
  RESPONSE = 'RESPONSE',
  RESOLUTION = 'RESOLUTION',
}

@Entity()
export class SlaDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: SlaType,
  })
  type: SlaType;

  @Column({ type: 'int' })
  targetMinutes: number;

  @ManyToOne(() => Calendar, (calendar) => calendar.slaDefinitions)
  @JoinColumn({ name: 'calendar_id' })
  calendar: Calendar;

  @OneToMany(() => SlaRule, (rule: any) => rule.slaDefinition)
  rules: SlaRule[];

  @OneToMany(() => SlaInstance, (instance: any) => instance.slaDefinition)
  instances: SlaInstance[];

  @OneToMany(() => SlaEscalationDefinition, (esc) => esc.slaDefinition)
  escalations: SlaEscalationDefinition[];
}
