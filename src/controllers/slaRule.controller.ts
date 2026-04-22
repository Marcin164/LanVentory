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
import { SlaRuleService } from 'src/services/slaRule.service';

@UseGuards(AuthGuard)
@Controller('sla/rules')
export class SlaRuleController {
  constructor(private readonly service: SlaRuleService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
