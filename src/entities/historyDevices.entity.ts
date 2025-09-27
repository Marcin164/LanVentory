import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class HistoryDevices {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  devicesId: number;

  @Column()
  historyId: number;
}
