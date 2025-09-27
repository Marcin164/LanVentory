import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Forms {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerId: number;

  @Column()
  name: string;

  @Column()
  url: string;
}
