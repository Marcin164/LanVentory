import { Controller, Get, Req } from '@nestjs/common';
import { Request } from '@nestjs/common';
import { FlowsService } from 'src/services/flows.service';

@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Get()
  async findAll(@Req() req: Request): Promise<any> {
    return this.flowsService.findAll();
  }
}
