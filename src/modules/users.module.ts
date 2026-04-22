import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from 'src/controllers/users.controller';
import { RbacController } from 'src/controllers/rbac.controller';
import { Users } from 'src/entities/users.entity';
import { UsersService } from 'src/services/users.service';
import { ActiveDirectoryModule } from './active-directory.module';

@Module({
  imports: [TypeOrmModule.forFeature([Users]), ActiveDirectoryModule],
  controllers: [UsersController, RbacController],
  providers: [UsersService],
})
export class UsersModule {}
