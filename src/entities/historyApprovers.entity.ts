import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class HistoryApprovers {
  @PrimaryGeneratedColumn()
  idhistory_approvers: number;

  @Column()
  userId: string;

  @Column()
  historyId: string;
}
