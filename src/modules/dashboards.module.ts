import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardsController } from 'src/controllers/dashboards.controller';
import { Dashboards } from 'src/entities/dashboards.entity';
import { DashboardsService } from 'src/services/dashboards.service';

@Module({
  imports: [TypeOrmModule.forFeature([Dashboards])],
  controllers: [DashboardsController],
  providers: [DashboardsService],
})
export class DashboardsModule {}
