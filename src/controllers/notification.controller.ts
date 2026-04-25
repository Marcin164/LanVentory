import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { NotificationService } from 'src/services/notification.service';

@UseGuards(AuthGuard)
@Roles(
  Role.Admin,
  Role.Helpdesk,
  Role.Auditor,
  Role.Compliance,
  Role.Approver,
  Role.Dpo,
)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  private actorOf(req: any): string {
    return req?.user?.properties?.metadata?.id ?? req?.user?.id ?? '';
  }

  @Get()
  list(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listForUser(this.actorOf(req), {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('unread-count')
  async unread(@Req() req: any) {
    const count = await this.service.unreadCount(this.actorOf(req));
    return { count };
  }

  @Post('read')
  async markRead(@Req() req: any, @Body() body: { ids: string[] }) {
    const affected = await this.service.markRead(this.actorOf(req), body.ids ?? []);
    return { affected };
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    const affected = await this.service.markAllRead(this.actorOf(req));
    return { affected };
  }
}
