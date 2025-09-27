import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Histories {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticket: string;

  @Column()
  date: string;

  @Column()
  details: string;

  @Column()
  justification: string;

  @Column()
  userId: number;
}
