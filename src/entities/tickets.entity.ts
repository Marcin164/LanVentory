import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TicketsComments } from './ticketsComments.entity';
import { Users } from './users.entity';
import { Devices } from './devices.entity';

export enum TicketType {
  INCIDENT = 'Incident',
  SERVICE = 'Service',
}

export enum TicketState {
  NEW = 'New',
  ASSIGNED = 'Assigned',
  IN_PROGRESS = 'In progress',
  AWAITING_USER = 'Awaiting for user',
  AWAITING_VENDOR = 'Awaiting for vendor',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed',
  CANCELL = 'Cancelled',
}

export enum TicketPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export enum TicketImpact {
  SINGLE = 'Single user',
  MULTIPLE = 'Multiple users',
  COMPANY = 'Whole company',
}

export enum TicketUrgency {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

@Entity()
export class Tickets {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  assignee: string;

  @Column({ nullable: true })
  assignmentGroup: string;

  @Column({
    type: 'enum',
    enum: TicketState,
    default: TicketState.NEW,
  })
  state: TicketState;

  @Column({
    type: 'enum',
    enum: TicketType,
  })
  type: TicketType;

  @Column({ unique: true })
  number: number;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @Column({
    type: 'enum',
    enum: TicketImpact,
    default: TicketImpact.SINGLE,
  })
  impact: TicketImpact;

  @Column({
    type: 'enum',
    enum: TicketUrgency,
    default: TicketUrgency.MEDIUM,
  })
  urgency: TicketUrgency;

  @Column()
  requesterId: string;

  @ManyToOne(() => Users, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({ name: 'requesterId' })
  requester: Users;

  @Column({ nullable: true })
  deviceId: string;

  @ManyToOne(() => Devices, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({ name: 'deviceId' })
  device: Devices;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @OneToMany(() => TicketsComments, (comment) => comment.ticket)
  comments: TicketsComments[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  closedAt: Date;

  @Column({ nullable: true })
  resolvedAt: Date;
}
