import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
} from 'typeorm';
import { Users } from './users.entity';

@Entity()
export class AssignmentGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Users, { eager: true })
  @JoinTable({
    name: 'assignment_group_members',
    joinColumn: { name: 'groupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  members: Users[];

  @CreateDateColumn()
  createdAt: Date;
}
