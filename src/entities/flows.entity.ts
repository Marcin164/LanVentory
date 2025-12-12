import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Flows {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column()
  enabled: boolean;
}
