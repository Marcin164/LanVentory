import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlowsController } from 'src/controllers/flows.controller';
import { Flow } from 'src/entities/flow.entity';
import { FlowsService } from 'src/services/flows.service';

@Module({
  imports: [TypeOrmModule.forFeature([Flow])],
  controllers: [FlowsController],
  providers: [FlowsService],
})
export class FlowsModule {}
