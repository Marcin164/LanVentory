import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Canned response templates reusable by helpdesk agents. Body supports
 * `{placeholder}` substitutions — resolved client-side at paste time
 * (e.g. `{requester.firstName}`, `{device.assetName}`, `{ticket.number}`).
 */
@Entity()
export class TicketTemplate {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 64, default: 'general' })
  category: string;

  @Column({ nullable: true })
  createdBy: string;

  /** When true, template shows up for everyone (not just the creator). */
  @Column({ default: true })
  shared: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
