import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Devices } from 'src/entities/devices.entity';
import { ComplianceRule } from 'src/entities/complianceRule.entity';
import { ComplianceResult } from 'src/entities/complianceResult.entity';
import { ComplianceService } from 'src/services/compliance.service';
import { ComplianceController } from 'src/controllers/compliance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Devices, ComplianceRule, ComplianceResult]),
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule implements OnModuleInit {
  private readonly logger = new Logger(ComplianceModule.name);

  constructor(private readonly service: ComplianceService) {}

  async onModuleInit() {
    const inserted = await this.service.seedBuiltins();
    if (inserted > 0) {
      this.logger.log(`Seeded ${inserted} built-in compliance rule(s)`);
    }
  }
}
