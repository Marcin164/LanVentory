import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class HistoryDevices {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  deviceId: string;

  @Column()
  historyId: string;
}
