import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { MfaGuard } from 'src/guards/mfaGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { ComplianceService } from 'src/services/compliance.service';

@UseGuards(AuthGuard, MfaGuard)
@Roles(Role.Admin, Role.Auditor, Role.Compliance, Role.Helpdesk)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Get('rules')
  listRules() {
    return this.service.listRules();
  }

  @Roles(Role.Admin, Role.Compliance)
  @Put('rules/:key')
  upsertRule(@Param('key') key: string, @Body() body: any) {
    return this.service.upsertRule({ ...body, key });
  }

  @Roles(Role.Admin, Role.Compliance)
  @Delete('rules/:key')
  async deleteRule(@Param('key') key: string) {
    await this.service.deleteRule(key);
    return { ok: true };
  }

  @Get('device/:deviceId')
  forDevice(@Param('deviceId') deviceId: string) {
    return this.service.resultsForDevice(deviceId);
  }

  @Roles(Role.Admin, Role.Compliance)
  @Post('device/:deviceId/evaluate')
  evaluate(@Param('deviceId') deviceId: string) {
    return this.service.evaluateDevice(deviceId);
  }

  @Get('summary')
  summary() {
    return this.service.summary();
  }
}
