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

  @Post()
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
