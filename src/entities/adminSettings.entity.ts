import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class AdminSettings {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  key: string;

  @Column({ type: 'jsonb' })
  value: any | string;
}
