import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPORT_REGISTRY } from 'src/helpers/reportRegistry';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DataSource) {}

  async generate(type: string, filters?: Record<string, any>) {
    const report = REPORT_REGISTRY[type];

    if (!report) {
      throw new NotFoundException(`Report ${type} not found`);
    }

    const result = await report({
      db: this.db,
      filters,
    });

    return result;
  }
}
