import {
  Controller,
  Post,
  Get,
  Req,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { Request } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { HistoriesService } from 'src/services/histories.service';

@UseGuards(AuthGuard)
@Controller('histories')
export class HistoriesController {
  constructor(private readonly historiesService: HistoriesService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.historiesService.findAll();
  }

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
