import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from 'src/entities/users.entity';
import { RolesGuard } from 'src/guards/rolesGuard.guard';
import { AdminGuard } from 'src/guards/adminGuard.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Users])],
  providers: [
    RolesGuard,
    AdminGuard,
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [RolesGuard, AdminGuard],
})
export class AccessControlModule {}
