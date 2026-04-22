import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { Request } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { HistoryAccessGuard } from 'src/guards/historyAccessGuard.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import {
  HistoriesService,
  type HistoryFeedQuery,
} from 'src/services/histories.service';

@UseGuards(AuthGuard)
@Controller('histories')
export class HistoriesController {
  constructor(private readonly historiesService: HistoriesService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.historiesService.findAll();
  }

  @UseGuards(HistoryAccessGuard)
  @Get('feed')
  async findFeed(@Query() query: HistoryFeedQuery): Promise<any> {
    return this.historiesService.findFeed(query);
  }

  @UseGuards(HistoryAccessGuard)
  @Get('feed/export')
  async exportFeed(
    @Query() query: HistoryFeedQuery,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, csv } = await this.historiesService.exportFeedCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Roles(Role.Admin, Role.Helpdesk)
  @Post()
  async createHistory(@Body() body: any): Promise<any> {
    return this.historiesService.createHistory(body);
  }

  @Get('device/:deviceId')
  async findDeviceHistory(@Param('deviceId') deviceId: string): Promise<any> {
    return this.historiesService.findDeviceHistory(deviceId);
  }

  @Get('user/:userId')
  async findUserHistory(@Param('userId') userId: string): Promise<any> {
    return this.historiesService.findUserHistory(userId);
  }
}
