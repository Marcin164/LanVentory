import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriesController } from 'src/controllers/history.controller';
import { Histories } from 'src/entities/histories.entity';
import { HistoryApprovers } from 'src/entities/historyApprovers.entity';
import { HistoryComponents } from 'src/entities/historyComponents.entity';
import { Users } from 'src/entities/users.entity';
import { HistoryAccessGuard } from 'src/guards/historyAccessGuard.guard';
import { HistoriesService } from 'src/services/histories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Histories,
      HistoryApprovers,
      HistoryComponents,
      Users,
    ]),
  ],
  controllers: [HistoriesController],
  providers: [HistoriesService, HistoryAccessGuard],
})
export class HistoryModule {}
