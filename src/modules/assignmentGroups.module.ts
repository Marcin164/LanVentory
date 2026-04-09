import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentGroup } from 'src/entities/assignmentGroup.entity';
import { Users } from 'src/entities/users.entity';
import { AssignmentGroupsController } from 'src/controllers/assignmentGroups.controller';
import { AssignmentGroupsService } from 'src/services/assignmentGroups.service';
import { AdminGuard } from 'src/guards/adminGuard.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AssignmentGroup, Users])],
  controllers: [AssignmentGroupsController],
  providers: [AssignmentGroupsService, AdminGuard],
})
export class AssignmentGroupsModule {}
