import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { PrivacyService } from 'src/services/privacy.service';
import { AuditService } from 'src/services/audit.service';

@UseGuards(AuthGuard)
@Roles(Role.Admin, Role.Dpo)
@Controller('privacy')
export class PrivacyController {
  constructor(
    private readonly privacyService: PrivacyService,
    private readonly auditService: AuditService,
  ) {}

  @Get('user/:id')
  async getUserPersonalData(@Param('id') id: string, @Req() req: any) {
    const actor = req?.user?.properties?.metadata?.id ?? req?.user?.id;
    const data = await this.privacyService.getPersonalData(id);
    await this.auditService.log(
      'PrivacyRecord',
      id,
      'read',
      { actor, targetUserId: id, fields: Object.keys(data ?? {}) },
    );
    return data;
  }

  @Get('access-log')
  async listAccessLog(
    @Query('targetUserId') targetUserId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.auditService.list({
      entityType: 'PrivacyRecord',
      entityId: targetUserId,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }
}
