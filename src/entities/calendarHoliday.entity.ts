import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Calendar } from './calendar.entity';

@Entity()
export class CalendarHoliday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  calendarId: string;

  @ManyToOne(() => Calendar, (c) => c.holidays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'calendarId' })
  calendar: Calendar;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  description: string;
}
