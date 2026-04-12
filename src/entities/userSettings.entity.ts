import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class UserSettings {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ default: 'en' })
  language: string;

  @Column({ default: 'light' })
  theme: string;

  @Column({
    type: 'jsonb',
    default: [
      'name',
      'username',
      'currentDevice',
      'lastLogon',
      'department',
      'office',
    ],
  })
  usersTableColumnOrder: string[];

  @Column({ type: 'jsonb' })
  devicesTableColumnOrder: string[];

  @Column({ type: 'jsonb' })
  ticketsTableColumnOrder: string[];

  @Column({ default: 'small' })
  reportsLayout: string;
}
