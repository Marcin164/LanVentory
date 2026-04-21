import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { ReportsService } from 'src/services/reports.service';

@UseGuards(AuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Roles(Role.Admin, Role.Auditor, Role.Compliance)
  @Get('list')
  list() {
    return this.reportsService.list();
  }

  @Roles(Role.Admin, Role.Compliance)
  @Post('batch')
  async batch(@Body() body: { types: string[] }) {
    return this.reportsService.generateBatch(body.types);
  }

  @Roles(Role.Admin, Role.Compliance, Role.Auditor)
  @Get('export')
  async export(@Query() query, @Req() req: any, @Res() res: Response) {
    const { type, format, ...filters } = query;
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id;
    if (format === 'pdf') {
      const { filename, buffer, sha256 } =
        await this.reportsService.exportPdf(type, filters, actor);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('X-Content-SHA256', sha256);
      res.send(buffer);
      return;
    }
    const { filename, csv } = await this.reportsService.exportCsv(type, filters);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Roles(Role.Admin, Role.Auditor, Role.Compliance)
  @Get()
  async generateReport(@Query() query) {
    const { type, ...filters } = query;
    return this.reportsService.generate(type, filters);
  }
}
