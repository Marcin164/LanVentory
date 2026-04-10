import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from 'src/controllers/audit.controller';
import { CalendarController } from 'src/controllers/calendar.controller';
import { SlaAdminController } from 'src/controllers/slaAdmin.controller';
import { SlaDefinitionController } from 'src/controllers/slaDefinition.controller';
import { SlaEscalationConfigController } from 'src/controllers/slaEscalationConfig.controller';
import { SlaRuleController } from 'src/controllers/slaRule.controller';
import { SlaRuntimeController } from 'src/controllers/slaRuntime.controller';
import { Calendar } from 'src/entities/calendar.entity';
import { CalendarHoliday } from 'src/entities/calendarHoliday.entity';
import { SlaDefinition } from 'src/entities/slaDefinition.entity';
import { SlaEscalationDefinition } from 'src/entities/slaEscalationDefinition.entity';
import { SlaEscalationInstance } from 'src/entities/slaEscalationInstance.entity';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { SlaPause } from 'src/entities/slaPause.entity';
import { SlaRule } from 'src/entities/slaRule.entity';
import { SystemAuditLog } from 'src/entities/systemAuditLog.entity';

import { Tickets } from 'src/entities/tickets.entity';
import { AuditService } from 'src/services/audit.service';
import { BusinessTimeService } from 'src/services/businessTime.service';
import { CalendarService } from 'src/services/calendar.service';
import { EscalationActionService } from 'src/services/escalationAction.service';
import { EscalationConfigService } from 'src/services/escalationConfig.service';
import { EscalationCreatorService } from 'src/services/escalationCreator.service';
import { EscalationEngineService } from 'src/services/escalationEngine.service';
import { SlaAdminService } from 'src/services/slaAdmin.service';
import { SlaBreachService } from 'src/services/slaBreach.service';
import { SlaCreatorService } from 'src/services/slaCreator.service';
import { SlaDefinitionService } from 'src/services/slaDefinition.service';
import { SlaEngineService } from 'src/services/slaEngine.service';
import { SlaPauseService } from 'src/services/slaPause.service';
import { SlaRuleService } from 'src/services/slaRule.service';
import { SlaRuntimeService } from 'src/services/slaRuntime.service';
import { EscalationWorker } from 'src/workers/escalation.worker';
import { SlaBreachWorker } from 'src/workers/slaBreach.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // SLA core
      SlaDefinition,
      SlaInstance,
      SlaRule,
      SlaPause,
      Calendar,
      CalendarHoliday,

      // Escalations
      SlaEscalationDefinition,
      SlaEscalationInstance,

      // potrzebne do akcji eskalacji
      Tickets,
      SystemAuditLog,
    ]),
  ],
  controllers: [
    // Runtime / monitoring
    SlaRuntimeController,
    SlaAdminController,

    // Config (ADMIN)
    CalendarController,
    SlaDefinitionController,
    SlaRuleController,
    SlaEscalationConfigController,

    // Audit (jeśli nie ma osobnego AuditModule)
    AuditController,
  ],
  providers: [
    // SLA runtime
    SlaEngineService,
    SlaCreatorService,
    SlaPauseService,
    SlaBreachService,
    SlaRuntimeService,
    BusinessTimeService,

    // SLA config
    CalendarService,
    SlaDefinitionService,
    SlaRuleService,

    // Escalations
    EscalationCreatorService,
    EscalationEngineService,
    EscalationActionService,
    EscalationWorker,
    EscalationConfigService,

    // Workers
    SlaBreachWorker,

    // Audit
    AuditService,
    SlaAdminService,
  ],
  exports: [SlaEngineService, SlaRuntimeService],
})
export class SlaModule {}
