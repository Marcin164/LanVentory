import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SystemAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'now()' })
  createdAt: Date;

  @Index({ unique: true })
  @Column({ type: 'bigint', nullable: true })
  sequence: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  hash: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  prevHash: string | null;
}
