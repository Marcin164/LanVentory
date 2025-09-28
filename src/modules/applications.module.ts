import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsController } from 'src/controllers/applications.controller';
import { Applications } from 'src/entities/applications.entity';
import { ApplicationsService } from 'src/services/applications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Applications])],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
