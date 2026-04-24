import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Devices } from './devices.entity';
import { Applications } from './applications.entity';

/**
 * One row per (device, application, version) install observed by the agent.
 * `firstSeenAt` / `lastSeenAt` are maintained by the scan pipeline; when a
 * previously-installed app stops appearing in a scan we stamp
 * `uninstalledAt` rather than deleting the row — keeps the trail for
 * audit and reporting.
 */
@Entity()
@Index(['deviceId', 'applicationId', 'version'], { unique: true })
export class DevicesApplications {
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
  applicationId: string;

  @ManyToOne(() => Applications, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Applications;

  @Column({ type: 'varchar', length: 128, nullable: true })
  version: string | null;

  @Column({ type: 'varchar', nullable: true })
  installationDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  modificationDate: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  firstSeenAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  uninstalledAt: Date | null;
}
