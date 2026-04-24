import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from 'src/controllers/devices.controller';
import { Devices } from 'src/entities/devices.entity';
import { Applications } from 'src/entities/applications.entity';
import { DevicesApplications } from 'src/entities/devicesApplications.entity';
import { DeviceTag } from 'src/entities/deviceTag.entity';
import { DeviceTagMap } from 'src/entities/deviceTagMap.entity';
import { AgentTask } from 'src/entities/agentTask.entity';
import { DeviceScan } from 'src/entities/deviceScan.entity';
import { DevicesService } from 'src/services/devices.service';
import { SoftwareInventoryService } from 'src/services/softwareInventory.service';
import { DeviceTagsService } from 'src/services/deviceTags.service';
import { AgentTaskService } from 'src/services/agentTask.service';
import { DeviceScanService } from 'src/services/deviceScan.service';
import { DeviceReportService } from 'src/services/deviceReport.service';
import { AgentTaskWorker } from 'src/workers/agentTask.worker';
import { CveModule } from './cve.module';
import { AgentGuard } from 'src/guards/agentGuard.guard';
import { AuditModule } from './audit.module';
import { ComplianceModule } from './compliance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Devices,
      Applications,
      DevicesApplications,
      DeviceTag,
      DeviceTagMap,
      AgentTask,
      DeviceScan,
    ]),
    AuditModule,
    ComplianceModule,
    CveModule,
  ],
  controllers: [DevicesController],
  providers: [
    DevicesService,
    SoftwareInventoryService,
    DeviceTagsService,
    AgentTaskService,
    DeviceScanService,
    DeviceReportService,
    AgentTaskWorker,
    AgentGuard,
  ],
  exports: [
    SoftwareInventoryService,
    DeviceTagsService,
    AgentTaskService,
    DeviceScanService,
    DeviceReportService,
  ],
})
export class DevicesModule {}
