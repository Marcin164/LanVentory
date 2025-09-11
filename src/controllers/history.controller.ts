import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Req,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Request } from '@nestjs/common';
import { HistoriesService } from 'src/services/histories.service';

@Controller('histories')
export class HistoriesController {
  constructor(private readonly historiesService: HistoriesService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.historiesService.findAll();
  }
}
