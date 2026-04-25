import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Keyword-based auto-categorization for incoming tickets. Each rule defines
 * a list of keywords (lower-cased substring match against the ticket
 * description + category) and the category to suggest. Lighter than NLP
 * but solves 80% of "agent forgot to set category" cases.
 */
@Entity()
export class TicketAutoTagRule {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  /** Comma-separated keywords (case-insensitive substring). */
  @Column({ type: 'text' })
  keywords: string;

  /** Category to assign when any keyword matches. */
  @Column()
  category: string;

  @Column({ default: 100 })
  priority: number;

  @Column({ default: true })
  enabled: boolean;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
