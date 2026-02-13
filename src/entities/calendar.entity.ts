import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CalendarHoliday } from './calendarHoliday.entity';
import { SlaDefinition } from './slaDefinition.entity';

@Entity()
export class Calendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  timezone: string; // np. Europe/Warsaw

  @Column({ type: 'time' })
  workStart: string; // '08:00:00'

  @Column({ type: 'time' })
  workEnd: string; // '16:00:00'

  @Column({ type: 'varchar', length: 7 })
  workingDays: string;

  @OneToMany(() => CalendarHoliday, (h: any) => h.calendar)
  holidays: CalendarHoliday[];

  @OneToMany(() => SlaDefinition, (sla: any) => sla.calendar)
  slaDefinitions: SlaDefinition[];
}
