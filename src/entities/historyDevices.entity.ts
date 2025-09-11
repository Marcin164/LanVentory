import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class HistoryDevices {
  @PrimaryGeneratedColumn()
  idhistory_devices: number;

  @Column()
  devicesId: string;

  @Column()
  historyId: string;
}
