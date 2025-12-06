import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriesController } from 'src/controllers/history.controller';
import { Histories } from 'src/entities/histories.entity';
import { HistoryApprovers } from 'src/entities/historyApprovers.entity';
import { HistoryComponents } from 'src/entities/historyComponents.entity';
import { HistoriesService } from 'src/services/histories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Histories, HistoryApprovers, HistoryComponents]),
  ],
  controllers: [HistoriesController],
  providers: [HistoriesService],
})
export class HistoryModule {}
