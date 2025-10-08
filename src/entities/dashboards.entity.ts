import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Dashboards {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  ownerId: string; // from propelauth

  @Column({ type: 'jsonb', nullable: true })
  cards: Record<string, any>;
}
