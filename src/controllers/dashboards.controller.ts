import {
  Controller,
  Get,
  Req,
  Param,
  UseGuards,
  Post,
  Body,
} from '@nestjs/common';
import { Request } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { DashboardsService } from 'src/services/dashboards.service';

@UseGuards(AuthGuard)
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.dashboardsService.findAll();
  }

  @Post()
  create(@Body() body: { name: string; ownerId: string }) {
    return this.dashboardsService.createDashboard(body.name, body.ownerId);
  }
}
