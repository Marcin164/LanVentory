import { Controller, Get, Req, Param, UseGuards } from '@nestjs/common';
import { Request } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { ApplicationsService } from 'src/services/applications.service';

@UseGuards(AuthGuard)
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

  @Get('/filters')
  async getFilters() {
    return this.applicationsService.getFilterOptions();
  }

  @Get('/:id')
  async findApplication(@Param('id') id: string): Promise<any> {
    return this.applicationsService.findApplication(id);
  }
}
