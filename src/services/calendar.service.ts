import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarHoliday } from 'src/entities/calendarHoliday.entity';
import { Calendar } from 'src/entities/calendar.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Calendar)
    private readonly calendarRepo: Repository<Calendar>,

    @InjectRepository(CalendarHoliday)
    private readonly holidayRepo: Repository<CalendarHoliday>,
  ) {}

  async getAll() {
    return this.calendarRepo.find({
      relations: ['holidays'],
      order: { name: 'ASC' },
    });
  }

  async create(dto: { name: string; workingDays: string; timezone: string }) {
    const calendar = this.calendarRepo.create({
      name: dto.name,
      workingDays: dto.workingDays,
      timezone: dto.timezone,
    });

    return this.calendarRepo.save(calendar);
  }

  async addHoliday(
    calendarId: string,
    dto: { date: string; description: string },
  ) {
    const calendar = await this.calendarRepo.findOne({
      where: { id: calendarId },
    });

    if (!calendar) {
      throw new NotFoundException('Calendar not found');
    }

    const holiday = this.holidayRepo.create({
      calendarId,
      date: new Date(dto.date),
      description: dto.description,
    });

    return this.holidayRepo.save(holiday);
  }

  async delete(id: string) {
    const calendar = await this.calendarRepo.findOne({
      where: { id },
    });

    if (!calendar) {
      throw new NotFoundException('Calendar not found');
    }

    await this.calendarRepo.remove(calendar);
    return { deleted: true };
  }
}
