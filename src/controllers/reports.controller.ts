import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from 'src/services/reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('list')
  list() {
    return this.reportsService.list();
  }

  @Get('export')
  async export(@Query() query, @Res() res: Response) {
    const { type, ...filters } = query;
    const { filename, csv } = await this.reportsService.exportCsv(type, filters);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get()
  async generateReport(@Query() query) {
    const { type, ...filters } = query;
    return this.reportsService.generate(type, filters);
  }
}
