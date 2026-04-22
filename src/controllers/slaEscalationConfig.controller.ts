import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { EscalationConfigService } from 'src/services/escalationConfig.service';

@UseGuards(AuthGuard)
@Controller('sla/escalations')
export class SlaEscalationConfigController {
  constructor(private readonly service: EscalationConfigService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Get('definitions')
  async getEscalationsGroupedBySla() {
    return this.service.getEscalationsGroupedBySla();
  }

  @Roles(Role.Admin)
  @Post()
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Roles(Role.Admin)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Roles(Role.Admin)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
