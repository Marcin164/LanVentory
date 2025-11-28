import { Entity, Column, PrimaryColumn, JoinColumn, ManyToOne } from 'typeorm';
import { Users } from './users.entity';

@Entity()
export class Histories {
  @PrimaryColumn()
  id: string;

  @Column()
  ticket: string;

  @Column()
  date: string;

  @Column()
  details: string;

  @Column()
  justification: string;

  @ManyToOne(() => Users, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: Users;

  @Column()
  userId: string;
}
