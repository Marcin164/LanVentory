import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { CalendarService } from 'src/services/calendar.service';

@UseGuards(AuthGuard)
@Controller('sla/calendars')
export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Post(':id/holidays')
  addHoliday(@Param('id') id: string, @Body() dto: any) {
    return this.service.addHoliday(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
