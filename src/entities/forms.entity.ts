import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Forms {
  @PrimaryColumn()
  id: string;

  @Column()
  ownerId: string;

  @Column()
  name: string;

  @Column()
  url: string;
}
