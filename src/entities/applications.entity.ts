import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Applications {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  version: string;

  @Column()
  size: number;

  @Column()
  publisher: string;
}
