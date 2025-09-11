import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Flow {
  @PrimaryGeneratedColumn()
  idflows: number;

  @Column()
  ownerId: string;

  @Column()
  name: string;

  @Column()
  enabled: boolean;
}
