import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from 'src/services/reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  async generateReport(@Query() query) {
    return this.reportsService.generate(query.type, query);
  }
}
