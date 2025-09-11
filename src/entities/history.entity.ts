import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class History {
  @PrimaryGeneratedColumn()
  idhistory: number;

  @Column()
  ticket: string;

  @Column()
  date: string;

  @Column()
  details: string;

  @Column()
  justification: string;
}
