import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { TicketTemplateService } from 'src/services/ticketTemplate.service';

const actorOf = (req: any): string =>
  req?.user?.properties?.metadata?.id ?? req?.user?.id ?? 'unknown';

@UseGuards(AuthGuard)
@Roles(Role.Admin, Role.Helpdesk, Role.Auditor)
@Controller('ticket-templates')
export class TicketTemplateController {
  constructor(private readonly service: TicketTemplateService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.listForUser(actorOf(req));
  }

  @Roles(Role.Admin, Role.Helpdesk)
  @Post()
  create(
    @Body()
    body: { name: string; body: string; category?: string; shared?: boolean },
    @Req() req: any,
  ) {
    return this.service.create(body, actorOf(req));
  }

  @Roles(Role.Admin, Role.Helpdesk)
  @Patch(':id')
  update(@Param('id') id: string, @Body() patch: any, @Req() req: any) {
    return this.service.update(id, patch, actorOf(req));
  }

  @Roles(Role.Admin, Role.Helpdesk)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.service.remove(id, actorOf(req));
    return { ok: true };
  }
}
