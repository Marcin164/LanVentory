import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity()
export class DeviceTag {
  @PrimaryColumn()
  id: string;

  @Index({ unique: true })
  @Column()
  key: string;

  @Column()
  label: string;

  @Column({ type: 'varchar', length: 16, default: '#2B9AE9' })
  color: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
