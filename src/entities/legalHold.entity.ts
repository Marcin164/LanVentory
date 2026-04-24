import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Legal / regulatory retention override for a specific user. While at least
 * one hold with `releasedAt IS NULL` exists for a user, erasure requests are
 * rejected.
 */
@Entity()
export class LegalHold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'text', nullable: true })
  legalBasis: string;

  @Column({ type: 'timestamptz', nullable: true })
  retainUntil: Date | null;

  @Column()
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ nullable: true })
  releasedBy: string;

  @Column({ type: 'text', nullable: true })
  releasedReason: string;
}
