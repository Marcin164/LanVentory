import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from 'src/guards/authGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { AuditService } from 'src/services/audit.service';

@UseGuards(AuthGuard)
@Roles(Role.Admin, Role.Auditor)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('verify')
  async verify() {
    return this.auditService.verifyChain();
  }

  @Get('ticket/:ticketId')
  async getTicketAudit(
    @Param('ticketId') ticketId: string,
    @Query() query: any,
  ) {
    return this.auditService.getForTicket(ticketId, query.action);
  }

  @Get('entity/:entityType/:entityId')
  async getEntityAudit(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getForEntity(entityType, entityId);
  }

  @Get()
  async list(@Query() query: any) {
    return this.auditService.list({
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action,
      from: query.from,
      to: query.to,
      limit: query.limit ? Number(query.limit) : undefined,
      cursor: query.cursor,
    });
  }
}
