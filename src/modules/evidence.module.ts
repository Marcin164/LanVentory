import { Module } from '@nestjs/common';
import { EvidenceController } from 'src/controllers/evidence.controller';
import { EvidencePackService } from 'src/services/evidencePack.service';
import { AuditModule } from './audit.module';
import { ReportsModule } from './reports.module';

@Module({
  imports: [AuditModule, ReportsModule],
  controllers: [EvidenceController],
  providers: [EvidencePackService],
})
export class EvidenceModule {}
