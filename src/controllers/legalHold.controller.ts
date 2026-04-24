import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { MfaGuard } from 'src/guards/mfaGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { LegalHoldService } from 'src/services/legalHold.service';

const actorOf = (req: any): string =>
  req?.user?.properties?.metadata?.id ?? req?.user?.id ?? 'unknown';

@UseGuards(AuthGuard, MfaGuard)
@Roles(Role.Admin, Role.Compliance, Role.Dpo)
@Controller('legal-holds')
export class LegalHoldController {
  constructor(private readonly service: LegalHoldService) {}

  @Get()
  list(
    @Query('userId') userId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.list(userId, activeOnly === 'true');
  }

  @Get('user/:userId/active')
  activeForUser(@Param('userId') userId: string) {
    return this.service.activeHolds(userId);
  }

  @Post()
  create(
    @Body()
    body: {
      userId: string;
      reason: string;
      legalBasis?: string;
      retainUntil?: string;
    },
    @Req() req: any,
  ) {
    return this.service.create({
      userId: body.userId,
      reason: body.reason,
      legalBasis: body.legalBasis ?? null,
      retainUntil: body.retainUntil ?? null,
      createdBy: actorOf(req),
    });
  }

  @Post(':id/release')
  release(
    @Param('id') id: string,
    @Body() body: { releasedReason: string },
    @Req() req: any,
  ) {
    return this.service.release({
      id,
      releasedBy: actorOf(req),
      releasedReason: body.releasedReason,
    });
  }
}
