import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlaEscalationConfigController } from 'src/controllers/slaEscalationConfig.controller';
import { Calendar } from 'src/entities/calendar.entity';
import { CalendarHoliday } from 'src/entities/calendarHoliday.entity';
import { SlaDefinition } from 'src/entities/slaDefinition.entity';
import { SlaEscalationDefinition } from 'src/entities/slaEscalationDefinition.entity';
import { SlaEscalationInstance } from 'src/entities/slaEscalationInstance.entity';
import { SlaInstance } from 'src/entities/slaInstance.entity';
import { SlaPause } from 'src/entities/slaPause.entity';
import { SlaRule } from 'src/entities/slaRule.entity';

import { Tickets } from 'src/entities/tickets.entity';
import { BusinessTimeService } from 'src/services/businessTime.service';
import { EscalationActionService } from 'src/services/escalationAction.service';
import { EscalationConfigService } from 'src/services/escalationConfig.service';
import { EscalationCreatorService } from 'src/services/escalationCreator.service';
import { EscalationEngineService } from 'src/services/escalationEngine.service';
import { SlaBreachService } from 'src/services/slaBreach.service';
import { SlaCreatorService } from 'src/services/slaCreator.service';
import { SlaEngineService } from 'src/services/slaEngine.service';
import { SlaPauseService } from 'src/services/slaPause.service';
import { EscalationWorker } from 'src/workers/escalation.worker';

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
    ]),
  ],
  controllers: [SlaEscalationConfigController],
  providers: [
    // SLA
    SlaEngineService,
    SlaCreatorService,
    SlaPauseService,
    SlaBreachService,
    BusinessTimeService,

    // Escalations
    EscalationCreatorService,
    EscalationEngineService,
    EscalationActionService,
    EscalationWorker,

    EscalationConfigService,
  ],
  exports: [
    SlaEngineService, // 🔥 eksportujemy tylko to
  ],
})
export class SlaModule {}
