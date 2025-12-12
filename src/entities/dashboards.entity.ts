import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Dashboards {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  userId: string; // from propelauth

  @Column({ type: 'jsonb', nullable: true })
  cards: Record<string, any>;
}
