import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tickets } from './tickets.entity';

export enum CommentType {
  PUBLIC = 'Public',
  WORKNOTE = 'Worknote',
}

@Entity()
export class TicketComments {
  @PrimaryColumn()
  id: string;

  @Column()
  ticketId: string;

  @ManyToOne(() => Tickets, (ticket: any) => ticket.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticketId' })
  ticket: Tickets;

  @Column()
  authorId: string;

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
