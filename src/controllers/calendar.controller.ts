import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { CalendarService } from 'src/services/calendar.service';

@UseGuards(AuthGuard)
@Controller('sla/calendars')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  getAll() {
    return this.calendarService.getAll();
  }

  @Post()
  create(@Body() dto: any) {
    return this.calendarService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.calendarService.update(id, dto);
  }

  @Post(':id/holidays')
  addHoliday(@Param('id') id: string, @Body() dto: any) {
    return this.calendarService.addHoliday(id, dto);
  }

  @Delete(':id/holidays')
  deleteHoliday(@Param('id') id: string) {
    return this.calendarService.deleteHoliday(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.calendarService.delete(id);
  }
}
