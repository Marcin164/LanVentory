import { Controller, Get, Post, Req, Body, Param } from '@nestjs/common';
import { Request } from '@nestjs/common';
import { ApplicationsService } from 'src/services/applications.service';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.applicationsService.findAll();
  }

  @Get('/table')
  async findAllTable(@Req() req: Request): Promise<any> {
    return this.applicationsService.findAllTable();
  }

  @Get('/:id')
  async findApplication(@Param('id') id: string): Promise<any> {
    return this.applicationsService.findApplication(id);
  }
}
