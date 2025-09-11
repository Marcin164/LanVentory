import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Form {
  @PrimaryGeneratedColumn()
  idforms: number;

  @Column()
  ownerId: string;

  @Column()
  name: string;

  @Column()
  url: string;
}
