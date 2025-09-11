import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from './entities/users.entity';
import { Device } from './entities/device.entity';
import { Flow } from './entities/flow.entity';
import { Form } from './entities/form.entity';
import { History } from './entities/history.entity';
import { HistoryApprovers } from './entities/historyApprovers.entity';
import { HistoryModule } from './modules/histories.module';
import { DevicesModule } from './modules/devices.module';
import { UsersModule } from './modules/users.module';
import { FormsModule } from './modules/forms.module';
import { FlowsModule } from './modules/flows.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '12345678',
      database: 'LanVentory',
      entities: [
        User,
        Device,
        Flow,
        Form,
        History,
        HistoryApprovers,
        HistoryModule,
      ],
      synchronize: false,
    }),
    DevicesModule,
    UsersModule,
    FormsModule,
    FlowsModule,
    HistoryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}
