import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from 'src/entities/users.entity';
import { PrivacyController } from 'src/controllers/privacy.controller';
import { PrivacyService } from 'src/services/privacy.service';
import { AuditModule } from './audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Users]), AuditModule],
  controllers: [PrivacyController],
  providers: [PrivacyService],
})
export class PrivacyModule {}
