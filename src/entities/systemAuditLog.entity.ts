import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
