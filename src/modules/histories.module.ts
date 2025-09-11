import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriesController } from 'src/controllers/history.controller';
import { History } from 'src/entities/history.entity';
import { HistoriesService } from 'src/services/histories.service';

@Module({
  imports: [TypeOrmModule.forFeature([History])],
  controllers: [HistoriesController],
  providers: [HistoriesService],
})
export class HistoryModule {}
