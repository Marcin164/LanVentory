import { Injectable } from '@nestjs/common';
import {
  addMinutes,
  addDays,
  differenceInMinutes,
  isBefore,
  set,
  getDay,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

import { Calendar } from '../entities/calendar.entity';

@Injectable()
export class BusinessTimeService {
  async calculateDueDate(
    startUtc: Date,
    minutes: number,
    calendar: Calendar,
  ): Promise<Date> {
    let remaining = minutes;

    // konwertujemy do timezone kalendarza
    let current = toZonedTime(startUtc, calendar.timezone);

    // ustaw start w czasie pracy
    current = await this.moveToBusinessTime(current, calendar);

    while (remaining > 0) {
      const endOfDay = this.getWorkEnd(current, calendar);

      const available = differenceInMinutes(endOfDay, current);

      if (remaining <= available) {
        const result = addMinutes(current, remaining);
        return fromZonedTime(result, calendar.timezone);
      }

      remaining -= available;

      // przejdź do następnego dnia pracy
      current = await this.nextBusinessDayStart(current, calendar);
    }

    return fromZonedTime(current, calendar.timezone);
  }

  /*
   * Dodaje czas pauzy do SLA
   */
  async addPauseTime(
    dueUtc: Date,
    pausedUtc: Date,
    resumedUtc: Date,
    calendar: Calendar,
  ): Promise<Date> {
    const pauseMinutes = await this.calculateBusinessMinutes(
      pausedUtc,
      resumedUtc,
      calendar,
    );

    const newDue = addMinutes(dueUtc, pauseMinutes);
    return newDue;
  }

  /*
   * Czy dany moment jest w czasie pracy
   */
  async isBusinessTime(dateUtc: Date, calendar: Calendar): Promise<boolean> {
    const date = toZonedTime(dateUtc, calendar.timezone);

    if (!(await this.isWorkingDay(date, calendar))) return false;

    const start = this.getWorkStart(date, calendar);
    const end = this.getWorkEnd(date, calendar);

    return !isBefore(date, start) && isBefore(date, end);
  }

  /*
   * =============== CORE HELPERS =================
   */

  private async moveToBusinessTime(date: Date, calendar: Calendar) {
    if (await this.isBusinessTime(date, calendar)) return date;

    const start = this.getWorkStart(date, calendar);

    // jeśli przed startem pracy
    if (isBefore(date, start) && (await this.isWorkingDay(date, calendar))) {
      return start;
    }

    // w przeciwnym razie idziemy do kolejnego dnia pracy
    return this.nextBusinessDayStart(date, calendar);
  }

  private async nextBusinessDayStart(date: Date, calendar: Calendar) {
    let next = addDays(date, 1);

    while (!(await this.isWorkingDay(next, calendar))) {
      next = addDays(next, 1);
    }

    return this.getWorkStart(next, calendar);
  }

  private async isWorkingDay(date: Date, calendar: any) {
    const day = getDay(date); // 0=Sunday

    // workingDays = "0111110"
    if (calendar.workingDays[day] !== '1') return false;

    // sprawdz święta
    const dateStr = date.toISOString().slice(0, 10);

    return !calendar.holidays?.some((h: any) => h.holidayDate === dateStr);
  }

  private getWorkStart(date: Date, calendar: Calendar) {
    const [h, m] = calendar.workStart.split(':').map(Number);

    return set(date, { hours: h, minutes: m, seconds: 0, milliseconds: 0 });
  }

  private getWorkEnd(date: Date, calendar: Calendar) {
    const [h, m] = calendar.workEnd.split(':').map(Number);

    return set(date, { hours: h, minutes: m, seconds: 0, milliseconds: 0 });
  }

  /*
   * Liczy ile minut roboczych jest między dwiema datami
   * używane dla pauz SLA
   */
  private async calculateBusinessMinutes(
    startUtc: Date,
    endUtc: Date,
    calendar: Calendar,
  ): Promise<number> {
    let total = 0;

    let current = toZonedTime(startUtc, calendar.timezone);
    const end = toZonedTime(endUtc, calendar.timezone);

    current = await this.moveToBusinessTime(current, calendar);

    while (isBefore(current, end)) {
      if (!(await this.isWorkingDay(current, calendar))) {
        current = await this.nextBusinessDayStart(current, calendar);
        continue;
      }

      const dayEnd = this.getWorkEnd(current, calendar);

      const segmentEnd = isBefore(dayEnd, end) ? dayEnd : end;

      total += differenceInMinutes(segmentEnd, current);

      current = await this.nextBusinessDayStart(current, calendar);
    }

    return total;
  }
}
