import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriesController } from 'src/controllers/history.controller';
import { Histories } from 'src/entities/histories.entity';
import { HistoryApprovers } from 'src/entities/historyApprovers.entity';
import { HistoryDevices } from 'src/entities/historyDevices.entity';
import { HistoriesService } from 'src/services/histories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Histories, HistoryApprovers, HistoryDevices]),
  ],
  controllers: [HistoriesController],
  providers: [HistoriesService],
})
export class HistoryModule {}
