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

  @Column({
    type: 'jsonb',
    default: [
      { maxDays: 7, color: '#30A712', label: 'Recent' },
      { maxDays: 30, color: '#F1C40F', label: 'Warning' },
      { maxDays: 90, color: '#F3606E', label: 'Inactive' },
    ],
  })
  lastLogonThresholds: Array<{
    maxDays: number;
    color: string;
    label: string;
  }>;

  @Column({ default: '#8A8A8A' })
  lastLogonDefaultColor: string;

  @Column({ type: 'jsonb', default: {} })
  filterPresets: Record<
    string,
    Array<{
      id: string;
      name: string;
      filters: Record<string, any>;
      lastUsed?: boolean;
    }>
  >;
}
