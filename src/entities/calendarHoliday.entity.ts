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

  @Column({ type: 'date' })
  holidayDate: string;

  @ManyToOne(() => Calendar, (calendar) => calendar.holidays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'calendar_id' })
  calendar: Calendar;
}
