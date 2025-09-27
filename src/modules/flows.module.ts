import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlowsController } from 'src/controllers/flows.controller';
import { Flows } from 'src/entities/flows.entity';
import { FlowsService } from 'src/services/flows.service';

@Module({
  imports: [TypeOrmModule.forFeature([Flows])],
  controllers: [FlowsController],
  providers: [FlowsService],
})
export class FlowsModule {}
