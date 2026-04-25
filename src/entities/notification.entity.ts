import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type NotificationType =
  | 'mention'
  | 'assignment'
  | 'sla_breach'
  | 'auto_followup'
  | 'cve_critical'
  | 'system';

@Entity()
@Index(['recipientId', 'readAt'])
export class Notification {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column()
  recipientId: string;

  @Column({ type: 'varchar', length: 32 })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  /** Where to send the user when they click the notification. */
  @Column({ type: 'varchar', nullable: true })
  url: string | null;

  /** Reference to the entity that triggered this notification. */
  @Column({ type: 'varchar', nullable: true })
  entityType: string | null;

  @Column({ type: 'varchar', nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', nullable: true })
  actorId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
