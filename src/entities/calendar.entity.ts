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

  @Column({ type: 'time', nullable: true })
  workStart: string;

  @Column({ type: 'time', nullable: true })
  workEnd: string;

  @Column({ type: 'int', array: true })
  workingDays: number[];

  @OneToMany(() => CalendarHoliday, (h: any) => h.calendar)
  holidays: CalendarHoliday[];

  @OneToMany(() => SlaDefinition, (sla: any) => sla.calendar)
  slaDefinitions: SlaDefinition[];
}
