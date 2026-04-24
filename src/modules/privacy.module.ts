import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from 'src/entities/users.entity';
import { LegalHold } from 'src/entities/legalHold.entity';
import { PrivacyController } from 'src/controllers/privacy.controller';
import { LegalHoldController } from 'src/controllers/legalHold.controller';
import { PrivacyService } from 'src/services/privacy.service';
import { LegalHoldService } from 'src/services/legalHold.service';
import { AuditModule } from './audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Users, LegalHold]), AuditModule],
  controllers: [PrivacyController, LegalHoldController],
  providers: [PrivacyService, LegalHoldService],
  exports: [LegalHoldService],
})
export class PrivacyModule {}
