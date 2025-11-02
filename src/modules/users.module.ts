import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from 'src/controllers/users.controller';
import { Users } from 'src/entities/users.entity';
import { UsersService } from 'src/services/users.service';
import { ActiveDirectoryModule } from './active-directory.module';

@Module({
  imports: [TypeOrmModule.forFeature([Users]), ActiveDirectoryModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
