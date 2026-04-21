import { Module } from '@nestjs/common';
import { ReportsController } from 'src/controllers/reports.controller';
import { ReportsService } from 'src/services/reports.service';

@Module({
  imports: [],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
