import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SlaInstance } from './slaInstance.entity';

@Entity('sla_pause')
export class SlaPause {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SlaInstance, (instance: any) => instance.pauses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sla_instance_id' })
  slaInstance: SlaInstance;

  @Column({ type: 'timestamp' })
  pausedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resumedAt: Date | null;
}
