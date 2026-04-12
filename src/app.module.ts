import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import adConfig from 'ad.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Users } from './entities/users.entity';
import { Devices } from './entities/devices.entity';
import { Flows } from './entities/flows.entity';
import { Forms } from './entities/forms.entity';
import { Histories } from './entities/histories.entity';
import { HistoryApprovers } from './entities/historyApprovers.entity';
import { HistoryComponents } from './entities/historyComponents.entity';
import { Applications } from './entities/applications.entity';
import { DevicesApplications } from './entities/devicesApplications.entity';
import { Dashboards } from './entities/dashboards.entity';
import { HistoryModule } from './modules/histories.module';
import { DevicesModule } from './modules/devices.module';
import { UsersModule } from './modules/users.module';
import { FormsModule } from './modules/forms.module';
import { FlowsModule } from './modules/flows.module';
import { ApplicationsModule } from './modules/applications.module';
import { AuthModule } from './modules/auth.module';
import { DashboardsModule } from './modules/dashboards.module';
import { Tickets } from './entities/tickets.entity';
import { TicketsComments } from './entities/ticketsComments.entity';
import { TicketsModule } from './modules/tickets.module';
import { TicketsApprovals } from './entities/ticketsApprovals.entity';
import { UserSettings } from './entities/userSettings.entity';
import { SettingsModule } from './modules/settings.module';
import { AdminSettings } from './entities/adminSettings.entity';
import { Calendar } from './entities/calendar.entity';
import { CalendarHoliday } from './entities/calendarHoliday.entity';
import { SlaDefinition } from './entities/slaDefinition.entity';
import { SlaInstance } from './entities/slaInstance.entity';
import { SlaPause } from './entities/slaPause.entity';
import { SlaRule } from './entities/slaRule.entity';
import { SlaModule } from './modules/sla.module';
import { SlaEscalationInstance } from './entities/slaEscalationInstance.entity';
import { SlaEscalationDefinition } from './entities/slaEscalationDefinition.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { SystemAuditLog } from './entities/systemAuditLog.entity';
import { ReportsModule } from './modules/reports.module';
import { SearchModule } from './modules/search.module';
import { AssignmentGroupsModule } from './modules/assignmentGroups.module';
import { AssignmentGroup } from './entities/assignmentGroup.entity';
import { TicketActivity } from './entities/ticketActivity.entity';
import { KnowledgeSpace } from './entities/knowledgeSpace.entity';
import { KnowledgeArticle } from './entities/knowledgeArticle.entity';
import { KnowledgeModule } from './modules/knowledge.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [adConfig],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'Root',
      password: '12345678',
      database: 'AssetManager',
      schema: 'public',
      entities: [
        Users,
        Devices,
        Flows,
        Forms,
        Histories,
        HistoryApprovers,
        HistoryComponents,
        Applications,
        DevicesApplications,
        Dashboards,
        Tickets,
        TicketsComments,
        TicketsApprovals,
        UserSettings,
        AdminSettings,
        Calendar,
        CalendarHoliday,
        SlaDefinition,
        SlaInstance,
        SlaPause,
        SlaRule,
        SlaEscalationDefinition,
        SlaEscalationInstance,
        SystemAuditLog,
        AssignmentGroup,
        TicketActivity,
        KnowledgeSpace,
        KnowledgeArticle,
      ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      Users,
      Devices,
      Flows,
      Forms,
      Histories,
      HistoryApprovers,
      HistoryComponents,
      Applications,
      DevicesApplications,
      Dashboards,
      Tickets,
      TicketsComments,
      TicketsApprovals,
      UserSettings,
      AdminSettings,
      Calendar,
      CalendarHoliday,
      SlaDefinition,
      SlaInstance,
      SlaPause,
      SlaRule,
      SlaEscalationDefinition,
      SlaEscalationInstance,
      SystemAuditLog,
      AssignmentGroup,
      TicketActivity,
    ]),
    ScheduleModule.forRoot(),
    DevicesModule,
    UsersModule,
    FormsModule,
    FlowsModule,
    HistoryModule,
    ApplicationsModule,
    DashboardsModule,
    AuthModule,
    TicketsModule,
    SettingsModule,
    SlaModule,
    ReportsModule,
    SearchModule,
    AssignmentGroupsModule,
    KnowledgeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}
