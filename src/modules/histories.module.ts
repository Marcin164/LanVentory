import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriesController } from 'src/controllers/history.controller';
import { Histories } from 'src/entities/histories.entity';
import { HistoriesService } from 'src/services/histories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Histories])],
  controllers: [HistoriesController],
  providers: [HistoriesService],
})
export class HistoryModule {}
