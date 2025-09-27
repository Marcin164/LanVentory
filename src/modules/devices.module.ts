import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from 'src/controllers/devices.controller';
import { Devices } from 'src/entities/devices.entity';
import { DevicesService } from 'src/services/devices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Devices])],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
