import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Applications {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  version: string;

  @Column()
  size: number;

  @Column()
  publisher: string;
}
