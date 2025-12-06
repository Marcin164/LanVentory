import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Histories } from './histories.entity';
import { Devices } from './devices.entity';

@Entity()
export class HistoryComponents {
  @PrimaryColumn()
  id: string;

  @Column()
  historyId: string;

  @ManyToOne(() => Histories, (h) => h.components, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'historyId' })
  history: Histories;

  @Column()
  deviceId: string;

  @ManyToOne(() => Devices, { nullable: true })
  @JoinColumn({ name: 'deviceId' })
  device: Devices;

  @Column()
  type: string;
}
