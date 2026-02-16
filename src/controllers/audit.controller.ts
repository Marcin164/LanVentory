import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from 'src/guards/authGuard.guard';
import { AuditService } from 'src/services/audit.service';

@UseGuards(AuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

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
}
