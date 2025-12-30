import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from './users.entity';
import { Histories } from './histories.entity';

@Entity()
export class HistoryApprovers {
  @PrimaryColumn()
  id: string;
}
