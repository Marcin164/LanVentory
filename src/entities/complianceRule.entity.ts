import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ComplianceOperator =
  | 'eq'
  | 'ne'
  | 'gte'
  | 'lte'
  | 'exists'
  | 'notExists'
  | 'contains'
  | 'notContains';

export type ComplianceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

@Entity()
export class ComplianceRule {
  /** Stable key used by API + UI (e.g. `bitlocker-enabled`). */
  @PrimaryColumn()
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: 'security' })
  category: string;

  /** Dot-path into the Devices row, e.g. `security.bitlocker.enabled`. */
  @Column()
  jsonPath: string;

  @Column()
  operator: ComplianceOperator;

  @Column({ type: 'jsonb', nullable: true })
  expected: any;

  @Column({ default: 'MEDIUM' })
  severity: ComplianceSeverity;

  @Column({ default: true })
  enabled: boolean;

  /** Built-in rules are shipped with the app; user-defined ones are not. */
  @Column({ default: false })
  builtin: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
