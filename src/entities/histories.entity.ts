import {
  Entity,
  Column,
  PrimaryColumn,
  JoinColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Users } from './users.entity';
import { HistoryApprovers } from './historyApprovers.entity';
import { HistoryComponents } from './historyComponents.entity';

@Entity()
export class Histories {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  ticket: string;

  @Column()
  date: string;

  @Column({ nullable: true })
  details: string;

  @Column({ nullable: true })
  agent: string;

  @Column({ nullable: true })
  justification: string;

  @Column({ nullable: true })
  type: number;

  @Column({ nullable: true })
  isUserFault: boolean;

  @Column({ nullable: true })
  fixes: string;

  @Column({ nullable: true })
  damages: string;

  @ManyToOne(() => Users, { eager: true, nullable: true })
  @JoinColumn({ name: 'userId' })
  user: Users;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  deviceId: string;

  @OneToMany(() => HistoryApprovers, (ha: any) => ha.history, {
    eager: true,
  })
  approvers: HistoryApprovers[];

  @OneToMany(() => HistoryComponents, (hc) => hc.history, {
    eager: true,
  })
  components: HistoryComponents[];
}
