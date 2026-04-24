import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { MfaGuard } from 'src/guards/mfaGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { PrivacyService } from 'src/services/privacy.service';
import { AuditService } from 'src/services/audit.service';

const actorOf = (req: any): string =>
  req?.user?.properties?.metadata?.id ?? req?.user?.id ?? 'unknown';

@UseGuards(AuthGuard, MfaGuard)
@Roles(Role.Admin, Role.Dpo)
@Controller('privacy')
export class PrivacyController {
  constructor(
    private readonly privacyService: PrivacyService,
    private readonly auditService: AuditService,
  ) {}

  @Get('user/:id')
  async getUserPersonalData(@Param('id') id: string, @Req() req: any) {
    const actor = actorOf(req);
    const data = await this.privacyService.getPersonalData(id);
    await this.auditService.log('PrivacyRecord', id, 'read', {
      actor,
      targetUserId: id,
      fields: Object.keys(data ?? {}),
    });
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

  /**
   * GDPR Art. 15 — right of access. Streams a ZIP containing everything we
   * hold about the subject.
   */
  @Post('user/:id/export')
  async exportUserData(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { stream, filename } = await this.privacyService.exportAllData(
      id,
      actorOf(req),
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    stream.pipe(res);
  }

  /**
   * GDPR Art. 17 — right to erasure. Anonymises the user row, respecting
   * active legal holds (409 if blocked).
   */
  @Post('user/:id/erase')
  async eraseUser(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.privacyService.eraseUser(id, {
      actor: actorOf(req),
      reason: body?.reason ?? '',
    });
  }
}
