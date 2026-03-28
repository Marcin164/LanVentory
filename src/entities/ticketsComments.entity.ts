import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tickets } from './tickets.entity';
import { Users } from './users.entity';

export enum CommentType {
  PUBLIC = 'Public',
  WORKNOTE = 'Worknote',
}

@Entity()
export class TicketsComments {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticketId: string;

  @ManyToOne(() => Tickets, (ticket) => ticket.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticketId' })
  ticket: Tickets;

  @Column({ nullable: true })
  authorId: string;

  @ManyToOne(() => Users, {
    eager: false,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'authorId' })
  author: Users;

  @Column()
  content: string;

  @Column({
    type: 'enum',
    enum: CommentType,
    default: CommentType.PUBLIC,
  })
  type: CommentType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
