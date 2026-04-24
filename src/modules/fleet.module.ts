import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Devices } from 'src/entities/devices.entity';
import { FleetService } from 'src/services/fleet.service';
import { FleetController } from 'src/controllers/fleet.controller';
import { ComplianceModule } from './compliance.module';
import { CveModule } from './cve.module';

@Module({
  imports: [TypeOrmModule.forFeature([Devices]), ComplianceModule, CveModule],
  controllers: [FleetController],
  providers: [FleetService],
  exports: [FleetService],
})
export class FleetModule {}
