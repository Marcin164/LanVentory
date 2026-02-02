import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tickets } from './tickets.entity';
import { Users } from './users.entity';

@Entity()
export class TicketsApprovals {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  ticketId: string;

  @ManyToOne(() => Tickets, (ticket) => ticket.approvals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticketId' })
  ticket: Tickets;

  @Column({ nullable: true })
  decision: string;

  @Column()
  requesterId: string;

  @Column({ nullable: true })
  approverId: string;

  @ManyToOne(() => Users, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({ name: 'approverId' })
  approver: Users;

  @Column({ nullable: true })
  details: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  decidedAt: Date;
}
