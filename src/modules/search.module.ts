import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from 'src/controllers/search.controller';
import { SearchService } from 'src/services/search.service';
import { Users } from 'src/entities/users.entity';
import { Devices } from 'src/entities/devices.entity';
import { Tickets } from 'src/entities/tickets.entity';
import { Histories } from 'src/entities/histories.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Devices, Tickets, Histories])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
