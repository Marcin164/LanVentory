import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Applications } from './applications.entity';

export type CveSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

/**
 * One row per (application, version, CVE). Populated by the CVE worker
 * (OSV.dev). Joined with `devices_applications` at query time to answer
 * "which devices are exposed to CVE-2024-xxxx".
 */
@Entity()
@Index(['applicationId', 'version'])
@Index(['cveId'])
export class CveMatch {
  @PrimaryColumn()
  id: string;

  @Column()
  applicationId: string;

  @ManyToOne(() => Applications, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Applications;

  @Column({ type: 'varchar', length: 128, nullable: true })
  version: string | null;

  @Column()
  cveId: string;

  @Column({ type: 'varchar', length: 16, default: 'UNKNOWN' })
  severity: CveSeverity;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'timestamptz' })
  firstSeenAt: Date;

  @Column({ type: 'timestamptz' })
  lastCheckedAt: Date;

  @Column({ type: 'varchar', length: 32, default: 'osv' })
  source: string;
}
