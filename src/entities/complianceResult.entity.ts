import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Devices } from './devices.entity';
import { ComplianceRule } from './complianceRule.entity';

@Entity()
@Index(['deviceId', 'ruleKey'], { unique: true })
export class ComplianceResult {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column()
  deviceId: string;

  @ManyToOne(() => Devices, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: Devices;

  @Index()
  @Column()
  ruleKey: string;

  @ManyToOne(() => ComplianceRule, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleKey', referencedColumnName: 'key' })
  rule: ComplianceRule;

  @Column()
  passed: boolean;

  /** Copied from rule at eval time so a later rule edit doesn't alter history. */
  @Column()
  severity: string;

  @Column({ type: 'jsonb', nullable: true })
  actual: any;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'timestamptz' })
  evaluatedAt: Date;
}
