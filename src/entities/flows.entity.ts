import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Flows {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerId: number;

  @Column()
  name: string;

  @Column()
  enabled: boolean;
}
