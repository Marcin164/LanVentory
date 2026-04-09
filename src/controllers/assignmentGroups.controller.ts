import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { AdminGuard } from 'src/guards/adminGuard.guard';
import { AssignmentGroupsService } from 'src/services/assignmentGroups.service';

@UseGuards(AuthGuard)
@Controller('assignment-groups')
export class AssignmentGroupsController {
  constructor(
    private readonly assignmentGroupsService: AssignmentGroupsService,
  ) {}

  @Get()
  async findAll() {
    return this.assignmentGroupsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.assignmentGroupsService.findOne(id);
  }

  @Get(':id/members')
  async findMembers(@Param('id') id: string) {
    return this.assignmentGroupsService.findMembers(id);
  }

  @UseGuards(AdminGuard)
  @Post()
  async create(@Body() dto: { name: string; description?: string }) {
    return this.assignmentGroupsService.create(dto);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string },
  ) {
    return this.assignmentGroupsService.update(id, dto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.assignmentGroupsService.delete(id);
  }

  @UseGuards(AdminGuard)
  @Put(':id/members')
  async setMembers(
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
  ) {
    return this.assignmentGroupsService.setMembers(id, body?.userIds ?? []);
  }

  @UseGuards(AdminGuard)
  @Post(':id/members/:userId')
  async addMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.assignmentGroupsService.addMember(id, userId);
  }

  @UseGuards(AdminGuard)
  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.assignmentGroupsService.removeMember(id, userId);
  }
}
