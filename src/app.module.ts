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
    ]),
    DevicesModule,
    UsersModule,
    FormsModule,
    FlowsModule,
    HistoryModule,
    ApplicationsModule,
    DashboardsModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}
