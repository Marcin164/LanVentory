import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { MfaGuard } from 'src/guards/mfaGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { RetentionService } from 'src/services/retention.service';
import { RetentionAction } from 'src/entities/retentionPolicy.entity';

@UseGuards(AuthGuard, MfaGuard)
@Roles(Role.Admin, Role.Compliance)
@Controller('retention')
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Get('supported')
  supported() {
    return this.retentionService.supportedEntityTypes();
  }

  @Get()
  list() {
    return this.retentionService.list();
  }

  @Post()
  create(
    @Body()
    body: {
      entityType: string;
      retentionDays: number;
      action?: RetentionAction;
      enabled?: boolean;
    },
  ) {
    return this.retentionService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      entityType?: string;
      retentionDays?: number;
      action?: RetentionAction;
      enabled?: boolean;
    },
  ) {
    return this.retentionService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.retentionService.delete(id);
  }

  @Post(':id/run')
  async run(@Param('id') id: string) {
    const all = await this.retentionService.list();
    const policy = all.find((p) => p.id === id);
    if (!policy) return { affected: 0 };
    const affected = await this.retentionService.runPolicy(policy);
    return { affected };
  }
}
