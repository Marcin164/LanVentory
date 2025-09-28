import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Users } from './entities/users.entity';
import { Devices } from './entities/devices.entity';
import { Flows } from './entities/flows.entity';
import { Forms } from './entities/forms.entity';
import { Histories } from './entities/histories.entity';
import { HistoryApprovers } from './entities/historyApprovers.entity';
import { Applications } from './entities/applications.entity';
import { DevicesApplications } from './entities/devicesApplications.entity';
import { HistoryModule } from './modules/histories.module';
import { DevicesModule } from './modules/devices.module';
import { UsersModule } from './modules/users.module';
import { FormsModule } from './modules/forms.module';
import { FlowsModule } from './modules/flows.module';
import { HistoryDevices } from './entities/historyDevices.entity';
import { ApplicationsModule } from './modules/applications.module';

@Module({
  imports: [
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
        HistoryDevices,
        Applications,
        DevicesApplications,
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
      HistoryDevices,
      Applications,
      DevicesApplications,
    ]),
    DevicesModule,
    UsersModule,
    FormsModule,
    FlowsModule,
    HistoryModule,
    ApplicationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}
