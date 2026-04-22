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
import { Role, Roles } from 'src/decorators/roles.decorator';
import { CalendarService } from 'src/services/calendar.service';

@UseGuards(AuthGuard)
@Controller('sla/calendars')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  getAll() {
    return this.calendarService.getAll();
  }

  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: any) {
    return this.calendarService.create(dto);
  }

  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.calendarService.update(id, dto);
  }

  @Roles(Role.Admin)
  @Post(':id/holidays')
  addHoliday(@Param('id') id: string, @Body() dto: any) {
    return this.calendarService.addHoliday(id, dto);
  }

  @Roles(Role.Admin)
  @Delete(':id/holidays')
  deleteHoliday(@Param('id') id: string) {
    return this.calendarService.deleteHoliday(id);
  }

  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.calendarService.delete(id);
  }
}
