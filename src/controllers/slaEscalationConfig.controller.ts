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

  @Get(':slaDefinitionId')
  async getForSla(@Param('slaDefinitionId') slaDefinitionId: string) {
    return this.service.getForSla(slaDefinitionId);
  }

  @Post(':slaDefinitionId')
  async create(
    @Param('slaDefinitionId') slaDefinitionId: string,
    @Body() dto: any,
  ) {
    return this.service.create(slaDefinitionId, dto);
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
