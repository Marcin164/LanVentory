import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from './users.entity';
import { Histories } from './histories.entity';

@Entity()
export class HistoryApprovers {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => Users, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: Users;

  @Column()
  historyId: string;

  @ManyToOne(() => Histories, (h) => h.approvers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'historyId' })
  history: Histories;
}
