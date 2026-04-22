import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { SlaAdminService } from 'src/services/slaAdmin.service';

@UseGuards(AuthGuard)
@Roles(Role.Admin, Role.Compliance, Role.Auditor)
@Controller('sla/admin')
export class SlaAdminController {
  constructor(private readonly adminService: SlaAdminService) {}

  // 📊 aktywne SLA
  @Get('active')
  getActive() {
    return this.adminService.getActive();
  }

  // 🚨 breached SLA
  @Get('breaches')
  getBreaches() {
    return this.adminService.getBreaches();
  }
}
