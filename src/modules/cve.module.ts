import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Applications } from 'src/entities/applications.entity';
import { DevicesApplications } from 'src/entities/devicesApplications.entity';
import { CveMatch } from 'src/entities/cveMatch.entity';
import { CveService } from 'src/services/cve.service';
import { CveController } from 'src/controllers/cve.controller';
import { CveWorker } from 'src/workers/cve.worker';
import { AuditModule } from './audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Applications, DevicesApplications, CveMatch]),
    AuditModule,
  ],
  controllers: [CveController],
  providers: [CveService, CveWorker],
  exports: [CveService],
})
export class CveModule {}
