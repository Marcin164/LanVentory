import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from 'src/controllers/devices.controller';
import { Device } from 'src/entities/device.entity';
import { DevicesService } from 'src/services/devices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
