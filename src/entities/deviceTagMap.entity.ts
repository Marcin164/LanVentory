import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Devices } from './devices.entity';
import { DeviceTag } from './deviceTag.entity';

@Entity()
@Index(['deviceId', 'tagId'], { unique: true })
export class DeviceTagMap {
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
  tagId: string;

  @ManyToOne(() => DeviceTag, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag: DeviceTag;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
