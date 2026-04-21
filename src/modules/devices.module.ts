import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from 'src/controllers/devices.controller';
import { Devices } from 'src/entities/devices.entity';
import { DevicesService } from 'src/services/devices.service';
import { AgentGuard } from 'src/guards/agentGuard.guard';
import { AuditModule } from './audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Devices]), AuditModule],
  controllers: [DevicesController],
  providers: [DevicesService, AgentGuard],
})
export class DevicesModule {}
