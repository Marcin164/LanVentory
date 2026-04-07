import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveDirectoryService } from 'src/services/active-directory.service';
import { ActiveDirectoryController } from 'src/controllers/active-directory.controller';
import { AdminSettings } from 'src/entities/adminSettings.entity';
import { Users } from 'src/entities/users.entity';
import { UsersService } from 'src/services/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminSettings, Users])],
  controllers: [ActiveDirectoryController],
  providers: [ActiveDirectoryService, UsersService],
  exports: [ActiveDirectoryService],
})
export class ActiveDirectoryModule {}
