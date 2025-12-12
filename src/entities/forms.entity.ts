import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Forms {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column()
  url: string;
}
